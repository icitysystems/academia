import { Test, TestingModule } from "@nestjs/testing";
import {
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { CoursesService } from "../src/courses/courses.service";
import { PrismaService } from "../src/prisma.service";

describe("CoursesService", () => {
	let service: CoursesService;
	let prismaService: jest.Mocked<PrismaService>;

	const mockInstructor = {
		id: "instructor-123",
		email: "instructor@example.com",
		name: "Test Instructor",
		role: "FACULTY",
	};

	const mockCourse = {
		id: "course-123",
		code: "CS101",
		title: "Introduction to Computer Science",
		description: "Learn the fundamentals of CS",
		shortDescription: "CS Fundamentals",
		instructorId: mockInstructor.id,
		categoryId: "category-123",
		level: "BEGINNER",
		language: "en",
		duration: 40,
		price: 0,
		currency: "XAF",
		status: "DRAFT",
		isPublic: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		instructor: mockInstructor,
		category: { id: "category-123", name: "Technology" },
	};

	const mockStudent = {
		id: "student-123",
		email: "student@example.com",
		name: "Test Student",
		role: "STUDENT",
	};

	const mockEnrollment = {
		id: "enrollment-123",
		courseId: mockCourse.id,
		studentId: mockStudent.id,
		status: "ACTIVE",
		enrolledAt: new Date(),
		progress: 0,
	};

	beforeEach(async () => {
		const mockPrismaService = {
			course: {
				findUnique: jest.fn(),
				findMany: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				delete: jest.fn(),
				count: jest.fn(),
			},
			courseModule: {
				findUnique: jest.fn(),
				findMany: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				delete: jest.fn(),
			},
			courseLesson: {
				findUnique: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				delete: jest.fn(),
			},
			enrollment: {
				findUnique: jest.fn(),
				findFirst: jest.fn(),
				findMany: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				count: jest.fn(),
			},
			lessonProgress: {
				findUnique: jest.fn(),
				findMany: jest.fn(),
				upsert: jest.fn(),
			},
			courseAnnouncement: {
				findMany: jest.fn(),
				create: jest.fn(),
			},
			courseCategory: {
				findMany: jest.fn(),
				findUnique: jest.fn(),
			},
			certificate: {
				create: jest.fn(),
				findMany: jest.fn(),
			},
			user: {
				findUnique: jest.fn(),
			},
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CoursesService,
				{ provide: PrismaService, useValue: mockPrismaService },
			],
		}).compile();

		service = module.get<CoursesService>(CoursesService);
		prismaService = module.get(PrismaService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("createCourse", () => {
		const createInput = {
			code: "CS102",
			title: "Advanced Programming",
			description: "Advanced concepts",
			level: "INTERMEDIATE",
		};

		it("should create a new course", async () => {
			const expectedCourse = {
				...mockCourse,
				...createInput,
			};
			prismaService.course.create = jest.fn().mockResolvedValue(expectedCourse);

			const result = await service.createCourse(mockInstructor.id, createInput);

			expect(result.title).toBe(createInput.title);
			expect(prismaService.course.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					code: createInput.code,
					title: createInput.title,
					instructorId: mockInstructor.id,
				}),
				include: expect.any(Object),
			});
		});

		it("should set default values for optional fields", async () => {
			prismaService.course.create = jest.fn().mockResolvedValue(mockCourse);

			await service.createCourse(mockInstructor.id, {
				code: "CS103",
				title: "Basic Course",
			});

			expect(prismaService.course.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					level: "BEGINNER",
					language: "en",
					price: 0,
					currency: "XAF",
					isPublic: false,
					status: "DRAFT",
				}),
				include: expect.any(Object),
			});
		});
	});

	describe("updateCourse", () => {
		it("should update course when instructor owns it", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue(mockCourse);
			prismaService.course.update = jest.fn().mockResolvedValue({
				...mockCourse,
				title: "Updated Title",
			});

			const result = await service.updateCourse(
				mockCourse.id,
				mockInstructor.id,
				{ title: "Updated Title" },
			);

			expect(result.title).toBe("Updated Title");
		});

		it("should throw NotFoundException for non-existent course", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue(null);

			await expect(
				service.updateCourse("invalid-id", mockInstructor.id, {
					title: "Test",
				}),
			).rejects.toThrow(NotFoundException);
		});

		it("should throw ForbiddenException when not the instructor", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue(mockCourse);

			await expect(
				service.updateCourse(mockCourse.id, "other-instructor", {
					title: "Test",
				}),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe("getCourse", () => {
		it("should return a course by ID", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue(mockCourse);

			const result = await service.getCourse(mockCourse.id);

			expect(result).toEqual(mockCourse);
			expect(prismaService.course.findUnique).toHaveBeenCalledWith({
				where: { id: mockCourse.id },
				include: expect.any(Object),
			});
		});

		it("should throw NotFoundException for non-existent course", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue(null);

			await expect(service.getCourse("invalid-id")).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("enrollInCourse", () => {
		it("should enroll student in course", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue({
				...mockCourse,
				status: "PUBLISHED",
				isPublic: true,
			});
			prismaService.enrollment.findFirst = jest.fn().mockResolvedValue(null);
			prismaService.enrollment.count = jest.fn().mockResolvedValue(0);
			prismaService.enrollment.create = jest
				.fn()
				.mockResolvedValue(mockEnrollment);

			const result = await service.enrollInCourse(
				mockStudent.id,
				mockCourse.id,
			);

			expect(result.studentId).toBe(mockStudent.id);
			expect(result.courseId).toBe(mockCourse.id);
		});

		it("should throw BadRequestException if already enrolled", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue({
				...mockCourse,
				status: "PUBLISHED",
			});
			prismaService.enrollment.findFirst = jest
				.fn()
				.mockResolvedValue(mockEnrollment);

			await expect(
				service.enrollInCourse(mockStudent.id, mockCourse.id),
			).rejects.toThrow(BadRequestException);
		});

		it("should throw BadRequestException if course is not published", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue(mockCourse);

			await expect(
				service.enrollInCourse(mockStudent.id, mockCourse.id),
			).rejects.toThrow(BadRequestException);
		});

		it("should throw BadRequestException if max enrollments reached", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue({
				...mockCourse,
				status: "PUBLISHED",
				isPublic: true,
				maxEnrollments: 10,
			});
			prismaService.enrollment.findFirst = jest.fn().mockResolvedValue(null);
			prismaService.enrollment.count = jest.fn().mockResolvedValue(10);

			await expect(
				service.enrollInCourse(mockStudent.id, mockCourse.id),
			).rejects.toThrow(BadRequestException);
		});
	});

	describe("getStudentEnrollments", () => {
		it("should return all enrollments for a student", async () => {
			const enrollments = [mockEnrollment];
			prismaService.enrollment.findMany = jest
				.fn()
				.mockResolvedValue(enrollments);

			const result = await service.getStudentEnrollments(mockStudent.id);

			expect(result).toEqual(enrollments);
			expect(prismaService.enrollment.findMany).toHaveBeenCalledWith({
				where: { studentId: mockStudent.id },
				include: expect.any(Object),
			});
		});
	});

	describe("createModule", () => {
		const moduleInput = {
			courseId: mockCourse.id,
			title: "Module 1: Introduction",
			description: "Overview of the course",
			orderIndex: 1,
		};

		it("should create a module for an owned course", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue(mockCourse);
			prismaService.courseModule.create = jest.fn().mockResolvedValue({
				id: "module-123",
				...moduleInput,
			});

			const result = await service.createModule(mockInstructor.id, moduleInput);

			expect(result.title).toBe(moduleInput.title);
		});

		it("should throw ForbiddenException if not the instructor", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue(mockCourse);

			await expect(
				service.createModule("other-instructor", moduleInput),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe("updateLessonProgress", () => {
		const progressInput = {
			lessonId: "lesson-123",
			completed: true,
			timeSpent: 1800,
		};

		it("should update or create lesson progress", async () => {
			const mockLesson = {
				id: progressInput.lessonId,
				module: {
					course: mockCourse,
				},
			};
			prismaService.courseLesson.findUnique = jest
				.fn()
				.mockResolvedValue(mockLesson);
			prismaService.enrollment.findFirst = jest
				.fn()
				.mockResolvedValue(mockEnrollment);
			prismaService.lessonProgress.upsert = jest.fn().mockResolvedValue({
				id: "progress-123",
				...progressInput,
				enrollmentId: mockEnrollment.id,
			});

			const result = await service.updateLessonProgress(
				mockStudent.id,
				progressInput,
			);

			expect(result.completed).toBe(true);
		});

		it("should throw NotFoundException if lesson does not exist", async () => {
			prismaService.courseLesson.findUnique = jest.fn().mockResolvedValue(null);

			await expect(
				service.updateLessonProgress(mockStudent.id, progressInput),
			).rejects.toThrow(NotFoundException);
		});

		it("should throw ForbiddenException if not enrolled", async () => {
			const mockLesson = {
				id: progressInput.lessonId,
				module: { course: mockCourse },
			};
			prismaService.courseLesson.findUnique = jest
				.fn()
				.mockResolvedValue(mockLesson);
			prismaService.enrollment.findFirst = jest.fn().mockResolvedValue(null);

			await expect(
				service.updateLessonProgress(mockStudent.id, progressInput),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe("publishCourse", () => {
		it("should publish a draft course", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue(mockCourse);
			prismaService.course.update = jest.fn().mockResolvedValue({
				...mockCourse,
				status: "PUBLISHED",
			});

			const result = await service.publishCourse(
				mockCourse.id,
				mockInstructor.id,
			);

			expect(result.status).toBe("PUBLISHED");
		});

		it("should throw ForbiddenException if not the instructor", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue(mockCourse);

			await expect(
				service.publishCourse(mockCourse.id, "other-instructor"),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe("getCourses", () => {
		it("should return paginated courses with filters", async () => {
			const courses = [mockCourse];
			prismaService.course.findMany = jest.fn().mockResolvedValue(courses);
			prismaService.course.count = jest.fn().mockResolvedValue(1);

			const result = await service.getCourses({
				skip: 0,
				take: 10,
				status: "PUBLISHED",
			});

			expect(result.courses).toEqual(courses);
			expect(result.total).toBe(1);
		});

		it("should filter by search query", async () => {
			prismaService.course.findMany = jest.fn().mockResolvedValue([mockCourse]);
			prismaService.course.count = jest.fn().mockResolvedValue(1);

			await service.getCourses({ search: "computer" });

			expect(prismaService.course.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						OR: expect.arrayContaining([
							{ title: { contains: "computer", mode: "insensitive" } },
						]),
					}),
				}),
			);
		});
	});

	describe("createAnnouncement", () => {
		const announcementInput = {
			courseId: mockCourse.id,
			title: "Important Update",
			content: "Course schedule has changed",
		};

		it("should create an announcement", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue(mockCourse);
			prismaService.courseAnnouncement.create = jest.fn().mockResolvedValue({
				id: "announcement-123",
				...announcementInput,
				authorId: mockInstructor.id,
			});

			const result = await service.createAnnouncement(
				mockInstructor.id,
				announcementInput,
			);

			expect(result.title).toBe(announcementInput.title);
		});

		it("should throw ForbiddenException if not the instructor", async () => {
			prismaService.course.findUnique = jest.fn().mockResolvedValue(mockCourse);

			await expect(
				service.createAnnouncement("other-instructor", announcementInput),
			).rejects.toThrow(ForbiddenException);
		});
	});
});
