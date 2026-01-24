import {
	Injectable,
	UnauthorizedException,
	ConflictException,
	BadRequestException,
	NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { PrismaService } from "../prisma.service";
import { RegisterInput } from "./dto/register.input";
import { LoginInput } from "./dto/login.input";
import { EmailService } from "./email.service";

@Injectable()
export class AuthService {
	private googleClient?: OAuth2Client;
	// Token expiry times
	private readonly PASSWORD_RESET_EXPIRY_HOURS = 1;
	private readonly EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

	constructor(
		private prisma: PrismaService,
		private jwtService: JwtService,
		private configService: ConfigService,
		private emailService: EmailService,
	) {}

	async register(input: RegisterInput, requireEmailVerification = false) {
		const existingUser = await this.prisma.user.findUnique({
			where: { email: input.email },
		});

		if (existingUser) {
			throw new ConflictException("Email already registered");
		}

		const passwordHash = await bcrypt.hash(input.password, 10);

		// Generate email verification token if required
		let emailVerificationToken: string | undefined;
		let emailVerificationExpiry: Date | undefined;

		if (requireEmailVerification) {
			emailVerificationToken = this.generateSecureToken();
			emailVerificationExpiry = new Date(
				Date.now() + this.EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000,
			);
		}

		const user = await this.prisma.user.create({
			data: {
				email: input.email,
				name: input.name,
				passwordHash,
				role: input.role || "TEACHER",
				emailVerified: !requireEmailVerification, // Auto-verify if not required
				emailVerificationToken,
				emailVerificationExpiry,
			},
		});

		// Send verification email if required
		if (requireEmailVerification && emailVerificationToken) {
			await this.emailService.sendEmailVerificationEmail(
				user.email,
				emailVerificationToken,
			);
		} else {
			// Send welcome email for auto-verified accounts
			await this.emailService.sendWelcomeEmail(user.email, user.name || "");
		}

		const token = this.generateToken(user.id, user.email, user.role);

		return {
			user,
			token,
		};
	}

	async login(input: LoginInput) {
		const user = await this.prisma.user.findUnique({
			where: { email: input.email },
		});

		if (!user || !user.passwordHash) {
			throw new UnauthorizedException("Invalid credentials");
		}

		const isPasswordValid = await bcrypt.compare(
			input.password,
			user.passwordHash,
		);

		if (!isPasswordValid) {
			throw new UnauthorizedException("Invalid credentials");
		}

		const token = this.generateToken(user.id, user.email, user.role);

		return {
			user,
			token,
		};
	}

	async loginWithGoogle(credential: string) {
		const googleClientId = this.configService.get<string>("google.clientId");
		if (!googleClientId) {
			throw new UnauthorizedException("Google OAuth is not configured");
		}

		if (!this.googleClient) {
			this.googleClient = new OAuth2Client(googleClientId);
		}

		let payload:
			| {
					email?: string;
					sub?: string;
					name?: string;
					given_name?: string;
					family_name?: string;
			  }
			| undefined;

		try {
			const ticket = await this.googleClient.verifyIdToken({
				idToken: credential,
				audience: googleClientId,
			});
			payload = ticket.getPayload() || undefined;
		} catch {
			throw new UnauthorizedException("Invalid Google credential");
		}

		const email = payload?.email?.toLowerCase();
		if (!email) {
			throw new UnauthorizedException("Google credential has no email");
		}

		const googleId = payload?.sub;
		const name = payload?.name || payload?.given_name || undefined;

		let user = await this.prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			user = await this.prisma.user.create({
				data: {
					email,
					name,
					role: "TEACHER",
					googleId,
				},
			});
		} else if (!user.googleId && googleId) {
			user = await this.prisma.user.update({
				where: { id: user.id },
				data: { googleId },
			});
		}

		const token = this.generateToken(user.id, user.email, user.role);

		return {
			user,
			token,
		};
	}

	async validateUser(userId: string) {
		return this.prisma.user.findUnique({
			where: { id: userId },
		});
	}

	// ==========================================
	// Password Reset Flow
	// ==========================================

	/**
	 * Request a password reset - sends email with reset link
	 */
	async forgotPassword(
		email: string,
	): Promise<{ success: boolean; message: string }> {
		const user = await this.prisma.user.findUnique({
			where: { email: email.toLowerCase() },
		});

		// Always return success to prevent email enumeration attacks
		if (!user) {
			return {
				success: true,
				message:
					"If an account exists with this email, a password reset link has been sent.",
			};
		}

		// Generate secure reset token
		const resetToken = this.generateSecureToken();
		const resetExpiry = new Date(
			Date.now() + this.PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000,
		);

		// Store token in database
		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				passwordResetToken: resetToken,
				passwordResetExpiry: resetExpiry,
			},
		});

		// Send reset email
		await this.emailService.sendPasswordResetEmail(user.email, resetToken);

		return {
			success: true,
			message:
				"If an account exists with this email, a password reset link has been sent.",
		};
	}

	/**
	 * Reset password using token
	 */
	async resetPassword(
		token: string,
		newPassword: string,
	): Promise<{ success: boolean; message: string }> {
		const user = await this.prisma.user.findFirst({
			where: {
				passwordResetToken: token,
				passwordResetExpiry: {
					gt: new Date(),
				},
			},
		});

		if (!user) {
			throw new BadRequestException(
				"Invalid or expired password reset token. Please request a new one.",
			);
		}

		// Hash new password
		const passwordHash = await bcrypt.hash(newPassword, 10);

		// Update password and clear reset token
		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				passwordHash,
				passwordResetToken: null,
				passwordResetExpiry: null,
			},
		});

		return {
			success: true,
			message:
				"Password has been reset successfully. You can now log in with your new password.",
		};
	}

	/**
	 * Validate reset token without resetting
	 */
	async validateResetToken(
		token: string,
	): Promise<{ valid: boolean; email?: string }> {
		const user = await this.prisma.user.findFirst({
			where: {
				passwordResetToken: token,
				passwordResetExpiry: {
					gt: new Date(),
				},
			},
		});

		if (!user) {
			return { valid: false };
		}

		// Mask email for display
		const maskedEmail = this.maskEmail(user.email);
		return { valid: true, email: maskedEmail };
	}

	// ==========================================
	// Email Verification Flow
	// ==========================================

	/**
	 * Verify email using token
	 */
	async verifyEmail(
		token: string,
	): Promise<{ success: boolean; message: string; email?: string }> {
		const user = await this.prisma.user.findFirst({
			where: {
				emailVerificationToken: token,
				emailVerificationExpiry: {
					gt: new Date(),
				},
			},
		});

		if (!user) {
			throw new BadRequestException(
				"Invalid or expired verification token. Please request a new verification email.",
			);
		}

		// Mark email as verified
		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				emailVerified: true,
				emailVerificationToken: null,
				emailVerificationExpiry: null,
			},
		});

		// Send welcome email
		await this.emailService.sendWelcomeEmail(user.email, user.name || "");

		return {
			success: true,
			message: "Email verified successfully. You can now access all features.",
			email: user.email,
		};
	}

	/**
	 * Resend verification email
	 */
	async resendVerificationEmail(
		userId: string,
	): Promise<{ success: boolean; message: string }> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		if (user.emailVerified) {
			return {
				success: true,
				message: "Email is already verified.",
			};
		}

		// Generate new verification token
		const emailVerificationToken = this.generateSecureToken();
		const emailVerificationExpiry = new Date(
			Date.now() + this.EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000,
		);

		await this.prisma.user.update({
			where: { id: user.id },
			data: {
				emailVerificationToken,
				emailVerificationExpiry,
			},
		});

		await this.emailService.sendEmailVerificationEmail(
			user.email,
			emailVerificationToken,
		);

		return {
			success: true,
			message: "Verification email sent. Please check your inbox.",
		};
	}

	// ==========================================
	// Utility Methods
	// ==========================================

	private generateToken(userId: string, email: string, role: string): string {
		return this.jwtService.sign({
			sub: userId,
			email,
			role,
		});
	}

	/**
	 * Generate a cryptographically secure random token
	 */
	private generateSecureToken(): string {
		return crypto.randomBytes(32).toString("hex");
	}

	/**
	 * Mask email address for display (e.g., j***n@example.com)
	 */
	private maskEmail(email: string): string {
		const [local, domain] = email.split("@");
		if (local.length <= 2) {
			return `${local[0]}***@${domain}`;
		}
		return `${local[0]}***${local[local.length - 1]}@${domain}`;
	}
}
