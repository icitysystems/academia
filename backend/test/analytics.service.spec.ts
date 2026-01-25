import { Test, TestingModule } from "@nestjs/testing";
import { AnalyticsService } from "../src/analytics/analytics.service";
import { PrismaService } from "../src/prisma.service";

describe("AnalyticsService", () => {
	let service: AnalyticsService;
	let prisma: PrismaService;

	const mockPrisma = {
		schemeOfWork: { count: jest.fn() },
		questionBank: { count: jest.fn() },
		onlineQuiz: { count: jest.fn() },
		examPaper: { count: jest.fn() },
		activityLog: {
			findMany: jest.fn(),
			create: jest.fn(),
		},
		learningResourceStats: { upsert: jest.fn() },
		enrollment: {
			findMany: jest.fn(),
			count: jest.fn(),
		},
		quizAttempt: { findMany: jest.fn() },
		assignmentSubmission: { findMany: jest.fn() },
		course: { findFirst: jest.fn() },
		user: {
			groupBy: jest.fn(),
			findMany: jest.fn(),
		},
		discussionThread: { findMany: jest.fn() },
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AnalyticsService,
				{
					provide: PrismaService,
					useValue: mockPrisma,
				},
			],
		}).compile();

		service = module.get<AnalyticsService>(AnalyticsService);
		prisma = module.get<PrismaService>(PrismaService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("getLearningResourceStats", () => {
		it("should return learning resource statistics for a user", async () => {
			const userId = "user-123";

			mockPrisma.schemeOfWork.count.mockResolvedValue(10);
			mockPrisma.questionBank.count.mockResolvedValue(50);
			mockPrisma.onlineQuiz.count.mockResolvedValue(5);
			mockPrisma.examPaper.count.mockResolvedValue(3);
			mockPrisma.activityLog.findMany.mockResolvedValue([
				{ id: "1", type: "LESSON_PLAN_CREATED", title: "Test" },
			]);
			mockPrisma.learningResourceStats.upsert.mockResolvedValue({});

			const result = await service.getLearningResourceStats(userId);

			expect(result).toEqual({
				lessonPlanCount: 10,
				questionCount: 50,
				activeQuizCount: 5,
				examPaperCount: 3,
				recentActivity: expect.any(Array),
			});

			expect(mockPrisma.learningResourceStats.upsert).toHaveBeenCalled();
		});
	});

	describe("getStudentAnalytics", () => {
		it("should return comprehensive student analytics", async () => {
			const studentId = "student-123";

			mockPrisma.enrollment.findMany.mockResolvedValue([
				{
					courseId: "course-1",
					course: { id: "course-1", title: "Math 101" },
					status: "ACTIVE",
					progress: 75,
					lessonProgress: [
						{ status: "COMPLETED" },
						{ status: "COMPLETED" },
						{ status: "IN_PROGRESS" },
					],
				},
			]);

			mockPrisma.quizAttempt.findMany.mockResolvedValue([
				{
					quizId: "quiz-1",
					quiz: { id: "quiz-1", title: "Quiz 1", totalMarks: 100 },
					totalScore: 85,
					maxScore: 100,
					percentage: 85,
					passed: true,
					status: "GRADED",
					submittedAt: new Date(),
				},
			]);

			mockPrisma.assignmentSubmission.findMany.mockResolvedValue([
				{
					assignmentId: "assign-1",
					assignment: { id: "assign-1", title: "Homework 1", totalMarks: 50 },
					score: 45,
					maxScore: 50,
					status: "GRADED",
					submittedAt: new Date(),
					isLate: false,
				},
			]);

			const result = await service.getStudentAnalytics(studentId);

			expect(result.courseProgress).toHaveLength(1);
			expect(result.courseProgress[0].courseTitle).toBe("Math 101");
			expect(result.quizPerformance).toHaveLength(1);
			expect(result.summary.avgQuizScore).toBe(85);
		});
	});

	describe("getCourseAnalytics", () => {
		it("should return course analytics for instructor", async () => {
			const courseId = "course-123";
			const instructorId = "instructor-123";

			mockPrisma.course.findFirst.mockResolvedValue({
				id: courseId,
				title: "Test Course",
				instructorId,
			});

			mockPrisma.enrollment.findMany.mockResolvedValue([
				{
					studentId: "student-1",
					student: {
						id: "student-1",
						name: "John Doe",
						email: "john@test.com",
					},
					status: "ACTIVE",
					progress: 50,
					lessonProgress: [],
					quizAttempts: [],
					submissions: [],
				},
			]);

			mockPrisma.onlineQuiz.findMany.mockResolvedValue([]);
			mockPrisma.assignmentSubmission.findMany.mockResolvedValue([]);
			mockPrisma.discussionThread.findMany.mockResolvedValue([]);

			const result = await service.getCourseAnalytics(courseId, instructorId);

			expect(result.courseId).toBe(courseId);
			expect(result.enrollmentStats.total).toBe(1);
			expect(result.enrollmentStats.active).toBe(1);
		});

		it("should throw error when course not found or access denied", async () => {
			mockPrisma.course.findFirst.mockResolvedValue(null);

			await expect(
				service.getCourseAnalytics("invalid-course", "invalid-instructor"),
			).rejects.toThrow("Course not found or access denied");
		});
	});

	describe("getPlatformAnalytics", () => {
		it("should return platform-wide analytics", async () => {
			mockPrisma.user.groupBy.mockResolvedValue([
				{ role: "STUDENT", _count: { id: 100 } },
				{ role: "FACULTY", _count: { id: 10 } },
				{ role: "ADMIN", _count: { id: 2 } },
			]);

			mockPrisma.course.findFirst.mockImplementation(() =>
				Promise.resolve(null),
			);
			mockPrisma.enrollment.count.mockResolvedValue(150);
			mockPrisma.user.findMany.mockResolvedValue([
				{
					id: "1",
					name: "User 1",
					email: "user1@test.com",
					role: "STUDENT",
					createdAt: new Date(),
				},
			]);
			mockPrisma.enrollment.findMany.mockResolvedValue([]);

			// Mock the course groupBy for status
			jest.spyOn(prisma, "course" as any, "get").mockReturnValue({
				groupBy: jest.fn().mockResolvedValue([
					{ status: "PUBLISHED", _count: { id: 20 } },
					{ status: "DRAFT", _count: { id: 5 } },
				]),
				findFirst: jest.fn().mockResolvedValue(null),
			});

			const result = await service.getPlatformAnalytics();

			expect(result.users.total).toBe(112);
			expect(result.users.byRole).toHaveLength(3);
		});
	});

	describe("logActivity", () => {
		it("should create an activity log entry", async () => {
			const activityData = {
				userId: "user-123",
				type: "LESSON_PLAN_CREATED",
				entityType: "LESSON_PLAN",
				entityId: "plan-456",
				title: "Created Algebra Lesson Plan",
			};

			const mockActivity = {
				id: "activity-123",
				...activityData,
				createdAt: new Date(),
			};

			mockPrisma.activityLog.create.mockResolvedValue(mockActivity);

			const result = await service.logActivity(
				activityData.userId,
				activityData.type,
				activityData.entityType,
				activityData.entityId,
				activityData.title,
			);

			expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
				data: expect.objectContaining(activityData),
			});
			expect(result.id).toBe("activity-123");
		});
	});

	describe("getRecentActivity", () => {
		it("should return recent activity for a user", async () => {
			const userId = "user-123";
			const mockActivities = [
				{ id: "1", type: "QUIZ_CREATED", title: "Quiz 1" },
				{ id: "2", type: "LESSON_CREATED", title: "Lesson 1" },
			];

			mockPrisma.activityLog.findMany.mockResolvedValue(mockActivities);

			const result = await service.getRecentActivity(userId, 5);

			expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
				where: { userId },
				orderBy: { createdAt: "desc" },
				take: 5,
			});
			expect(result).toEqual(mockActivities);
		});
	});
});
