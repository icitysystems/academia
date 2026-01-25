import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
	UnauthorizedException,
	ConflictException,
	BadRequestException,
	NotFoundException,
} from "@nestjs/common";
import { AuthService } from "../src/auth/auth.service";
import { PrismaService } from "../src/prisma.service";
import { EmailService } from "../src/auth/email.service";
import * as bcrypt from "bcrypt";

// Mock bcrypt
jest.mock("bcrypt", () => ({
	hash: jest.fn().mockResolvedValue("hashed_password"),
	compare: jest.fn().mockResolvedValue(true),
}));

describe("AuthService", () => {
	let service: AuthService;
	let prismaService: jest.Mocked<PrismaService>;
	let jwtService: jest.Mocked<JwtService>;
	let emailService: jest.Mocked<EmailService>;
	let configService: jest.Mocked<ConfigService>;

	const mockUser = {
		id: "user-123",
		email: "test@example.com",
		name: "Test User",
		passwordHash: "hashed_password",
		role: "STUDENT",
		isActive: true,
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(async () => {
		const mockPrismaService = {
			user: {
				findUnique: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				findMany: jest.fn(),
			},
		};

		const mockJwtService = {
			sign: jest.fn().mockReturnValue("mock_jwt_token"),
			verify: jest.fn(),
		};

		const mockEmailService = {
			sendWelcomeEmail: jest.fn().mockResolvedValue(true),
			sendEmailVerificationEmail: jest.fn().mockResolvedValue(true),
			sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
		};

		const mockConfigService = {
			get: jest.fn((key: string) => {
				const config: { [key: string]: any } = {
					"jwt.secret": "test_secret",
					"jwt.expiresIn": "7d",
					"google.clientId": "google_client_id",
				};
				return config[key];
			}),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: JwtService, useValue: mockJwtService },
				{ provide: EmailService, useValue: mockEmailService },
				{ provide: ConfigService, useValue: mockConfigService },
			],
		}).compile();

		service = module.get<AuthService>(AuthService);
		prismaService = module.get(PrismaService);
		jwtService = module.get(JwtService);
		emailService = module.get(EmailService);
		configService = module.get(ConfigService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("register", () => {
		const registerInput = {
			email: "new@example.com",
			password: "password123",
			name: "New User",
		};

		it("should register a new user successfully", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(null);
			prismaService.user.create = jest.fn().mockResolvedValue({
				...mockUser,
				email: registerInput.email,
				name: registerInput.name,
			});

			const result = await service.register(registerInput);

			expect(result.user).toBeDefined();
			expect(result.token).toBeDefined();
			expect(prismaService.user.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					email: registerInput.email,
					name: registerInput.name,
				}),
			});
			expect(emailService.sendWelcomeEmail).toHaveBeenCalled();
		});

		it("should throw ConflictException if email already exists", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);

			await expect(service.register(registerInput)).rejects.toThrow(
				ConflictException,
			);
		});

		it("should hash the password before storing", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(null);
			prismaService.user.create = jest.fn().mockResolvedValue(mockUser);

			await service.register(registerInput);

			expect(bcrypt.hash).toHaveBeenCalledWith(registerInput.password, 10);
		});

		it("should send verification email when requireEmailVerification is true", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(null);
			prismaService.user.create = jest.fn().mockResolvedValue({
				...mockUser,
				emailVerified: false,
			});

			await service.register(registerInput, true);

			expect(emailService.sendEmailVerificationEmail).toHaveBeenCalled();
		});
	});

	describe("login", () => {
		const loginInput = {
			email: "test@example.com",
			password: "password123",
		};

		it("should login successfully with valid credentials", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
			prismaService.user.update = jest.fn().mockResolvedValue(mockUser);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);

			const result = await service.login(loginInput);

			expect(result.user).toBeDefined();
			expect(result.token).toBe("mock_jwt_token");
		});

		it("should throw UnauthorizedException for non-existent user", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

			await expect(service.login(loginInput)).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it("should throw UnauthorizedException for invalid password", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
			(bcrypt.compare as jest.Mock).mockResolvedValue(false);

			await expect(service.login(loginInput)).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it("should throw UnauthorizedException for inactive user", async () => {
			prismaService.user.findUnique = jest
				.fn()
				.mockResolvedValue({ ...mockUser, isActive: false });
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);

			await expect(service.login(loginInput)).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it("should update lastLoginAt on successful login", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
			prismaService.user.update = jest.fn().mockResolvedValue(mockUser);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);

			await service.login(loginInput);

			expect(prismaService.user.update).toHaveBeenCalledWith({
				where: { id: mockUser.id },
				data: { lastLoginAt: expect.any(Date) },
			});
		});
	});

	describe("validateUser", () => {
		it("should return user for valid ID", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);

			const result = await service.validateUser(mockUser.id);

			expect(result).toEqual(mockUser);
		});

		it("should throw UnauthorizedException for non-existent user", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

			await expect(service.validateUser("invalid-id")).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it("should throw UnauthorizedException for inactive user", async () => {
			prismaService.user.findUnique = jest
				.fn()
				.mockResolvedValue({ ...mockUser, isActive: false });

			await expect(service.validateUser(mockUser.id)).rejects.toThrow(
				UnauthorizedException,
			);
		});
	});

	describe("requestPasswordReset", () => {
		it("should send password reset email for existing user", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockUser);
			prismaService.user.update = jest.fn().mockResolvedValue(mockUser);

			const result = await service.requestPasswordReset(mockUser.email);

			expect(result).toBe(true);
			expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
		});

		it("should return true even for non-existent email (security)", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

			const result = await service.requestPasswordReset(
				"nonexistent@example.com",
			);

			// Should return true to not reveal if email exists
			expect(result).toBe(true);
			expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
		});
	});

	describe("resetPassword", () => {
		const validToken = "valid_reset_token";
		const newPassword = "newPassword123";

		it("should reset password with valid token", async () => {
			const userWithToken = {
				...mockUser,
				passwordResetToken: validToken,
				passwordResetExpiry: new Date(Date.now() + 3600000), // 1 hour from now
			};
			prismaService.user.findUnique = jest
				.fn()
				.mockResolvedValue(userWithToken);
			prismaService.user.update = jest.fn().mockResolvedValue(mockUser);

			const result = await service.resetPassword(validToken, newPassword);

			expect(result).toBe(true);
			expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
		});

		it("should throw BadRequestException for invalid token", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

			await expect(
				service.resetPassword("invalid_token", newPassword),
			).rejects.toThrow(BadRequestException);
		});

		it("should throw BadRequestException for expired token", async () => {
			const userWithExpiredToken = {
				...mockUser,
				passwordResetToken: validToken,
				passwordResetExpiry: new Date(Date.now() - 3600000), // 1 hour ago
			};
			prismaService.user.findUnique = jest
				.fn()
				.mockResolvedValue(userWithExpiredToken);

			await expect(
				service.resetPassword(validToken, newPassword),
			).rejects.toThrow(BadRequestException);
		});
	});

	describe("verifyEmail", () => {
		const verificationToken = "valid_verification_token";

		it("should verify email with valid token", async () => {
			const userWithToken = {
				...mockUser,
				emailVerified: false,
				emailVerificationToken: verificationToken,
				emailVerificationExpiry: new Date(Date.now() + 86400000), // 24 hours from now
			};
			prismaService.user.findUnique = jest
				.fn()
				.mockResolvedValue(userWithToken);
			prismaService.user.update = jest
				.fn()
				.mockResolvedValue({ ...mockUser, emailVerified: true });

			const result = await service.verifyEmail(verificationToken);

			expect(result).toBe(true);
			expect(prismaService.user.update).toHaveBeenCalledWith({
				where: { id: userWithToken.id },
				data: {
					emailVerified: true,
					emailVerificationToken: null,
					emailVerificationExpiry: null,
				},
			});
		});

		it("should throw BadRequestException for invalid token", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

			await expect(service.verifyEmail("invalid_token")).rejects.toThrow(
				BadRequestException,
			);
		});

		it("should throw BadRequestException for expired token", async () => {
			const userWithExpiredToken = {
				...mockUser,
				emailVerificationToken: verificationToken,
				emailVerificationExpiry: new Date(Date.now() - 86400000), // 24 hours ago
			};
			prismaService.user.findUnique = jest
				.fn()
				.mockResolvedValue(userWithExpiredToken);

			await expect(service.verifyEmail(verificationToken)).rejects.toThrow(
				BadRequestException,
			);
		});
	});

	describe("generateToken", () => {
		it("should generate a valid JWT token", () => {
			const token = (service as any).generateToken(
				mockUser.id,
				mockUser.email,
				mockUser.role,
			);

			expect(token).toBe("mock_jwt_token");
			expect(jwtService.sign).toHaveBeenCalledWith(
				{ sub: mockUser.id, email: mockUser.email, role: mockUser.role },
				expect.any(Object),
			);
		});
	});
});
