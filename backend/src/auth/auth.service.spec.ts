import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";

describe("AuthService", () => {
	let service: AuthService;
	let prismaService: PrismaService;
	let jwtService: JwtService;

	const mockPrismaService = {
		user: {
			findUnique: jest.fn(),
			create: jest.fn(),
		},
	};

	const mockJwtService = {
		sign: jest.fn().mockReturnValue("mock-jwt-token"),
		verify: jest.fn(),
	};

	const mockConfigService = {
		get: jest.fn((key: string) => {
			const config: Record<string, any> = {
				"jwt.secret": "test-secret",
				"jwt.expiresIn": "1h",
			};
			return config[key];
		}),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: JwtService, useValue: mockJwtService },
				{ provide: ConfigService, useValue: mockConfigService },
			],
		}).compile();

		service = module.get<AuthService>(AuthService);
		prismaService = module.get<PrismaService>(PrismaService);
		jwtService = module.get<JwtService>(JwtService);

		// Reset mocks
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("register", () => {
		it("should create a new user and return token", async () => {
			const input = {
				email: "test@example.com",
				password: "password123",
				name: "Test User",
			};

			mockPrismaService.user.findUnique.mockResolvedValue(null);
			mockPrismaService.user.create.mockResolvedValue({
				id: "1",
				email: input.email,
				name: input.name,
				role: "TEACHER",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const result = await service.register(input);

			expect(result).toBeDefined();
			expect(result.token).toBe("mock-jwt-token");
			expect(result.user.email).toBe(input.email);
			expect(mockPrismaService.user.create).toHaveBeenCalled();
		});

		it("should throw error if email already exists", async () => {
			const input = {
				email: "existing@example.com",
				password: "password123",
				name: "Test User",
			};

			mockPrismaService.user.findUnique.mockResolvedValue({
				id: "1",
				email: input.email,
			});

			await expect(service.register(input)).rejects.toThrow();
		});
	});

	describe("login", () => {
		it("should return token for valid credentials", async () => {
			const input = {
				email: "test@example.com",
				password: "password123",
			};

			const hashedPassword = await bcrypt.hash(input.password, 10);

			mockPrismaService.user.findUnique.mockResolvedValue({
				id: "1",
				email: input.email,
				passwordHash: hashedPassword,
				name: "Test User",
				role: "TEACHER",
			});

			const result = await service.login(input);

			expect(result).toBeDefined();
			expect(result.token).toBe("mock-jwt-token");
		});

		it("should throw error for invalid email", async () => {
			const input = {
				email: "nonexistent@example.com",
				password: "password123",
			};

			mockPrismaService.user.findUnique.mockResolvedValue(null);

			await expect(service.login(input)).rejects.toThrow();
		});

		it("should throw error for invalid password", async () => {
			const input = {
				email: "test@example.com",
				password: "wrongpassword",
			};

			const hashedPassword = await bcrypt.hash("correctpassword", 10);

			mockPrismaService.user.findUnique.mockResolvedValue({
				id: "1",
				email: input.email,
				passwordHash: hashedPassword,
				name: "Test User",
				role: "TEACHER",
			});

			await expect(service.login(input)).rejects.toThrow();
		});
	});

	describe("validateUser", () => {
		it("should return user for valid id", async () => {
			const userId = "1";
			const user = {
				id: userId,
				email: "test@example.com",
				name: "Test User",
				role: "TEACHER",
			};

			mockPrismaService.user.findUnique.mockResolvedValue(user);

			const result = await service.validateUser(userId);

			expect(result).toEqual(user);
		});

		it("should return null for invalid id", async () => {
			mockPrismaService.user.findUnique.mockResolvedValue(null);

			const result = await service.validateUser("invalid-id");

			expect(result).toBeNull();
		});
	});
});
