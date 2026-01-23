import {
	Injectable,
	UnauthorizedException,
	ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma.service";
import { RegisterInput } from "./dto/register.input";
import { LoginInput } from "./dto/login.input";

@Injectable()
export class AuthService {
	private googleClient?: OAuth2Client;

	constructor(
		private prisma: PrismaService,
		private jwtService: JwtService,
		private configService: ConfigService,
	) {}

	async register(input: RegisterInput) {
		const existingUser = await this.prisma.user.findUnique({
			where: { email: input.email },
		});

		if (existingUser) {
			throw new ConflictException("Email already registered");
		}

		const passwordHash = await bcrypt.hash(input.password, 10);

		const user = await this.prisma.user.create({
			data: {
				email: input.email,
				name: input.name,
				passwordHash,
				role: input.role || "TEACHER",
			},
		});

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

	private generateToken(userId: string, email: string, role: string): string {
		return this.jwtService.sign({
			sub: userId,
			email,
			role,
		});
	}
}
