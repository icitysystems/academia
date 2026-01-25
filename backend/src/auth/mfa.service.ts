import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ConfigService } from "@nestjs/config";

// Optional dependencies - service will throw clear errors if not installed
let speakeasy: any;
let QRCode: any;

try {
	speakeasy = require("speakeasy");
} catch (e) {
	// speakeasy not installed
}

try {
	QRCode = require("qrcode");
} catch (e) {
	// qrcode not installed
}

/**
 * Check if MFA dependencies are available
 */
function checkMfaDependencies(): void {
	if (!speakeasy || !QRCode) {
		throw new BadRequestException(
			"MFA is not available. Required packages not installed. " +
				"Please run: npm install speakeasy qrcode @types/speakeasy @types/qrcode",
		);
	}
}

export interface MfaSetupResult {
	secret: string;
	qrCodeUrl: string;
	backupCodes: string[];
}

export interface MfaVerifyResult {
	success: boolean;
	backupCodeUsed?: boolean;
}

@Injectable()
export class MfaService {
	private readonly logger = new Logger(MfaService.name);
	private readonly appName: string;

	constructor(
		private prisma: PrismaService,
		private configService: ConfigService,
	) {
		this.appName = this.configService.get<string>("APP_NAME") || "Academia";
	}

	/**
	 * Generate a new MFA secret and QR code for setup
	 */
	async setupMfa(userId: string): Promise<MfaSetupResult> {
		checkMfaDependencies();

		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new BadRequestException("User not found");
		}

		// Check if user already has MFA enabled
		const existingMfa = await this.prisma.userMfa.findUnique({
			where: { userId },
		});

		if (existingMfa?.isEnabled) {
			throw new BadRequestException(
				"MFA is already enabled. Disable it first to set up again.",
			);
		}

		// Generate a new secret
		const secret = speakeasy.generateSecret({
			name: `${this.appName} (${user.email})`,
			length: 32,
		});

		// Generate backup codes
		const backupCodes = this.generateBackupCodes(10);

		// Store the secret (not enabled yet until verified)
		await this.prisma.userMfa.upsert({
			where: { userId },
			create: {
				userId,
				secret: secret.base32,
				backupCodes: JSON.stringify(backupCodes),
				isEnabled: false,
			},
			update: {
				secret: secret.base32,
				backupCodes: JSON.stringify(backupCodes),
				isEnabled: false,
			},
		});

		// Generate QR code URL
		const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || "");

		return {
			secret: secret.base32,
			qrCodeUrl,
			backupCodes,
		};
	}

	/**
	 * Verify TOTP token and enable MFA
	 */
	async enableMfa(userId: string, token: string): Promise<boolean> {
		const mfa = await this.prisma.userMfa.findUnique({
			where: { userId },
		});

		if (!mfa || !mfa.secret) {
			throw new BadRequestException("MFA setup not initiated");
		}

		if (mfa.isEnabled) {
			throw new BadRequestException("MFA is already enabled");
		}

		// Verify the token
		const isValid = speakeasy.totp.verify({
			secret: mfa.secret,
			encoding: "base32",
			token,
			window: 1, // Allow 1 step tolerance
		});

		if (!isValid) {
			throw new BadRequestException("Invalid verification code");
		}

		// Enable MFA
		await this.prisma.userMfa.update({
			where: { userId },
			data: { isEnabled: true, enabledAt: new Date() },
		});

		this.logger.log(`MFA enabled for user ${userId}`);
		return true;
	}

	/**
	 * Verify a TOTP token or backup code
	 */
	async verifyMfa(userId: string, token: string): Promise<MfaVerifyResult> {
		checkMfaDependencies();

		const mfa = await this.prisma.userMfa.findUnique({
			where: { userId },
		});

		if (!mfa || !mfa.isEnabled) {
			// MFA not enabled, verification passes
			return { success: true };
		}

		// First try to verify as TOTP
		const isValidTotp = speakeasy.totp.verify({
			secret: mfa.secret,
			encoding: "base32",
			token,
			window: 1,
		});

		if (isValidTotp) {
			// Update last used
			await this.prisma.userMfa.update({
				where: { userId },
				data: { lastUsedAt: new Date() },
			});
			return { success: true, backupCodeUsed: false };
		}

		// Try backup code
		const backupCodes: string[] = JSON.parse(mfa.backupCodes || "[]");
		const codeIndex = backupCodes.indexOf(token.toUpperCase());

		if (codeIndex !== -1) {
			// Remove used backup code
			backupCodes.splice(codeIndex, 1);
			await this.prisma.userMfa.update({
				where: { userId },
				data: {
					backupCodes: JSON.stringify(backupCodes),
					lastUsedAt: new Date(),
				},
			});

			this.logger.warn(
				`Backup code used for user ${userId}. ${backupCodes.length} codes remaining.`,
			);
			return { success: true, backupCodeUsed: true };
		}

		return { success: false };
	}

	/**
	 * Check if user has MFA enabled
	 */
	async isMfaEnabled(userId: string): Promise<boolean> {
		const mfa = await this.prisma.userMfa.findUnique({
			where: { userId },
		});
		return mfa?.isEnabled || false;
	}

	/**
	 * Disable MFA for a user
	 */
	async disableMfa(userId: string, token: string): Promise<boolean> {
		// Verify token first
		const verifyResult = await this.verifyMfa(userId, token);
		if (!verifyResult.success) {
			throw new BadRequestException("Invalid verification code");
		}

		await this.prisma.userMfa.update({
			where: { userId },
			data: {
				isEnabled: false,
				secret: null,
				backupCodes: null,
			},
		});

		this.logger.log(`MFA disabled for user ${userId}`);
		return true;
	}

	/**
	 * Regenerate backup codes
	 */
	async regenerateBackupCodes(
		userId: string,
		token: string,
	): Promise<string[]> {
		// Verify current token first
		const verifyResult = await this.verifyMfa(userId, token);
		if (!verifyResult.success) {
			throw new BadRequestException("Invalid verification code");
		}

		const backupCodes = this.generateBackupCodes(10);

		await this.prisma.userMfa.update({
			where: { userId },
			data: { backupCodes: JSON.stringify(backupCodes) },
		});

		return backupCodes;
	}

	/**
	 * Get remaining backup codes count
	 */
	async getBackupCodesCount(userId: string): Promise<number> {
		const mfa = await this.prisma.userMfa.findUnique({
			where: { userId },
		});

		if (!mfa?.backupCodes) return 0;

		const codes: string[] = JSON.parse(mfa.backupCodes);
		return codes.length;
	}

	/**
	 * Generate random backup codes
	 */
	private generateBackupCodes(count: number): string[] {
		const codes: string[] = [];
		for (let i = 0; i < count; i++) {
			// Generate 8-character alphanumeric code
			const code = Array.from({ length: 8 }, () =>
				"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
					Math.floor(Math.random() * 36),
				),
			).join("");
			codes.push(code);
		}
		return codes;
	}
}
