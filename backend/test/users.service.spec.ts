import { Test, TestingModule } from "@nestjs/testing";
import {
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { UsersService } from "../src/users/users.service";
import { PrismaService } from "../src/prisma.service";
import { UserRole } from "../src/common/types";

describe("UsersService", () => {
	let service: UsersService;
	let prismaService: jest.Mocked<PrismaService>;

	const mockAdmin = {
		id: "admin-123",
		email: "admin@example.com",
		name: "Admin User",
		role: UserRole.ADMIN,
		isActive: true,
	};

	const mockFaculty = {
		id: "faculty-123",
		email: "faculty@example.com",
		name: "Faculty User",
		role: UserRole.FACULTY,
		isActive: true,
	};

	const mockStudent = {
		id: "student-123",
		email: "student@example.com",
		name: "Student User",
		firstName: "John",
		lastName: "Doe",
		role: UserRole.STUDENT,
		isActive: true,
		enrollments: [],
		instructedCourses: [],
	};

	beforeEach(async () => {
		const mockPrismaService = {
			user: {
				create: jest.fn(),
				findUnique: jest.fn(),
				findMany: jest.fn(),
				update: jest.fn(),
				delete: jest.fn(),
				count: jest.fn(),
			},
			enrollment: {
				findMany: jest.fn(),
			},
			lessonProgress: {
				findMany: jest.fn(),
			},
			assignment: {
				findMany: jest.fn(),
			},
			certificate: {
				findMany: jest.fn(),
			},
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UsersService,
				{ provide: PrismaService, useValue: mockPrismaService },
			],
		}).compile();

		service = module.get<UsersService>(UsersService);
		prismaService = module.get(PrismaService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("createUser", () => {
		const createInput = {
			email: "newuser@example.com",
			name: "New User",
			firstName: "New",
			lastName: "User",
			role: UserRole.STUDENT,
		};

		it("should create a user when admin makes request", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockAdmin);
			prismaService.user.create = jest.fn().mockResolvedValue({
				id: "new-user-123",
				...createInput,
			});

			const result = await service.createUser(createInput, mockAdmin.id);

			expect(result.email).toBe(createInput.email);
			expect(prismaService.user.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					email: createInput.email,
					role: UserRole.STUDENT,
				}),
			});
		});

		it("should throw ForbiddenException when non-admin tries to create", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockStudent);

			await expect(
				service.createUser(createInput, mockStudent.id),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe("updateUser", () => {
		it("should allow user to update their own profile", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockStudent);
			prismaService.user.update = jest.fn().mockResolvedValue({
				...mockStudent,
				name: "Updated Name",
			});

			const result = await service.updateUser(
				mockStudent.id,
				{ name: "Updated Name" },
				mockStudent.id,
			);

			expect(result.name).toBe("Updated Name");
		});

		it("should allow admin to update any user", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockAdmin);
			prismaService.user.update = jest.fn().mockResolvedValue({
				...mockStudent,
				name: "Admin Updated",
			});

			const result = await service.updateUser(
				mockStudent.id,
				{ name: "Admin Updated" },
				mockAdmin.id,
			);

			expect(result.name).toBe("Admin Updated");
		});

		it("should throw ForbiddenException when non-admin tries to update another user", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockStudent);

			await expect(
				service.updateUser(
					mockFaculty.id,
					{ name: "Unauthorized Update" },
					mockStudent.id,
				),
			).rejects.toThrow(ForbiddenException);
		});

		it("should throw ForbiddenException when non-admin tries to change role", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockStudent);

			await expect(
				service.updateUser(
					mockStudent.id,
					{ role: UserRole.FACULTY },
					mockStudent.id,
				),
			).rejects.toThrow(ForbiddenException);
		});

		it("should allow admin to change user role", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockAdmin);
			prismaService.user.update = jest.fn().mockResolvedValue({
				...mockStudent,
				role: UserRole.FACULTY,
			});

			const result = await service.updateUser(
				mockStudent.id,
				{ role: UserRole.FACULTY },
				mockAdmin.id,
			);

			expect(result.role).toBe(UserRole.FACULTY);
		});
	});

	describe("getUser", () => {
		it("should return a user by ID", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockStudent);

			const result = await service.getUser(mockStudent.id);

			expect(result.id).toBe(mockStudent.id);
			expect(prismaService.user.findUnique).toHaveBeenCalledWith({
				where: { id: mockStudent.id },
				include: expect.any(Object),
			});
		});

		it("should throw NotFoundException for non-existent user", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(null);

			await expect(service.getUser("invalid-id")).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("listUsers", () => {
		it("should return paginated users for admin", async () => {
			const users = [mockStudent, mockFaculty];
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockAdmin);
			prismaService.user.findMany = jest.fn().mockResolvedValue(users);
			prismaService.user.count = jest.fn().mockResolvedValue(2);

			const result = await service.listUsers(mockAdmin.id);

			expect(result.users).toEqual(users);
			expect(result.total).toBe(2);
		});

		it("should filter by role", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockAdmin);
			prismaService.user.findMany = jest.fn().mockResolvedValue([mockStudent]);
			prismaService.user.count = jest.fn().mockResolvedValue(1);

			await service.listUsers(mockAdmin.id, { role: UserRole.STUDENT });

			expect(prismaService.user.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						role: UserRole.STUDENT,
					}),
				}),
			);
		});

		it("should filter by search query", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockAdmin);
			prismaService.user.findMany = jest.fn().mockResolvedValue([mockStudent]);
			prismaService.user.count = jest.fn().mockResolvedValue(1);

			await service.listUsers(mockAdmin.id, { search: "john" });

			expect(prismaService.user.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						OR: expect.arrayContaining([
							expect.objectContaining({ firstName: { contains: "john" } }),
						]),
					}),
				}),
			);
		});

		it("should throw ForbiddenException for non-admin", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockStudent);

			await expect(service.listUsers(mockStudent.id)).rejects.toThrow(
				ForbiddenException,
			);
		});
	});

	describe("deleteUser", () => {
		it("should soft delete user by default", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockAdmin);
			prismaService.user.update = jest.fn().mockResolvedValue({
				...mockStudent,
				isActive: false,
			});

			const result = await service.deleteUser(mockStudent.id, mockAdmin.id);

			expect(result.isActive).toBe(false);
			expect(prismaService.user.update).toHaveBeenCalledWith({
				where: { id: mockStudent.id },
				data: { isActive: false },
			});
		});

		it("should hard delete when specified", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockAdmin);
			prismaService.user.delete = jest.fn().mockResolvedValue(mockStudent);

			const result = await service.deleteUser(
				mockStudent.id,
				mockAdmin.id,
				true,
			);

			expect(result.id).toBe(mockStudent.id);
			expect(prismaService.user.delete).toHaveBeenCalledWith({
				where: { id: mockStudent.id },
			});
		});

		it("should throw ForbiddenException for non-admin", async () => {
			prismaService.user.findUnique = jest.fn().mockResolvedValue(mockStudent);

			await expect(
				service.deleteUser(mockFaculty.id, mockStudent.id),
			).rejects.toThrow(ForbiddenException);
		});
	});
});

// Input interfaces to match service expectations
interface CreateUserInput {
	email: string;
	name: string;
	firstName?: string;
	lastName?: string;
	role?: string;
	phone?: string;
}

interface UpdateUserInput {
	name?: string;
	firstName?: string;
	lastName?: string;
	role?: string;
	phone?: string;
	isActive?: boolean;
}
