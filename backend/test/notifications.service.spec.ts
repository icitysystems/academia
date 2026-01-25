import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "../src/notifications/notifications.service";
import { PrismaService } from "../src/prisma.service";

describe("NotificationsService", () => {
	let service: NotificationsService;
	let prisma: PrismaService;

	const mockPrisma = {
		notification: {
			create: jest.fn(),
			createMany: jest.fn(),
			findMany: jest.fn(),
			findFirst: jest.fn(),
			update: jest.fn(),
			updateMany: jest.fn(),
			delete: jest.fn(),
			count: jest.fn(),
		},
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				NotificationsService,
				{
					provide: PrismaService,
					useValue: mockPrisma,
				},
			],
		}).compile();

		service = module.get<NotificationsService>(NotificationsService);
		prisma = module.get<PrismaService>(PrismaService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("create", () => {
		it("should create a notification", async () => {
			const notificationData = {
				userId: "user-123",
				type: "ASSIGNMENT_DUE",
				title: "Assignment Due Soon",
				message: "Your assignment is due tomorrow",
				link: "/assignments/456",
			};

			const expectedNotification = {
				id: "notif-123",
				...notificationData,
				isRead: false,
				createdAt: new Date(),
			};

			mockPrisma.notification.create.mockResolvedValue(expectedNotification);

			const result = await service.create(notificationData);

			expect(mockPrisma.notification.create).toHaveBeenCalledWith({
				data: notificationData,
			});
			expect(result).toEqual(expectedNotification);
		});
	});

	describe("getByUserId", () => {
		it("should return notifications for a user", async () => {
			const userId = "user-123";
			const mockNotifications = [
				{ id: "1", userId, title: "Test 1", isRead: false },
				{ id: "2", userId, title: "Test 2", isRead: true },
			];

			mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

			const result = await service.getByUserId(userId);

			expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
				where: { userId },
				orderBy: { createdAt: "desc" },
			});
			expect(result).toEqual(mockNotifications);
		});
	});

	describe("markAsRead", () => {
		it("should mark a notification as read", async () => {
			const notificationId = "notif-123";
			const userId = "user-123";

			const mockNotification = {
				id: notificationId,
				userId,
				isRead: true,
			};

			mockPrisma.notification.findFirst.mockResolvedValue({
				id: notificationId,
				userId,
			});
			mockPrisma.notification.update.mockResolvedValue(mockNotification);

			const result = await service.markAsRead(notificationId, userId);

			expect(mockPrisma.notification.update).toHaveBeenCalledWith({
				where: { id: notificationId },
				data: { isRead: true },
			});
			expect(result.isRead).toBe(true);
		});

		it("should throw error when notification not found", async () => {
			mockPrisma.notification.findFirst.mockResolvedValue(null);

			await expect(
				service.markAsRead("invalid-id", "user-123"),
			).rejects.toThrow("Notification not found or access denied");
		});
	});

	describe("markAllAsRead", () => {
		it("should mark all notifications as read for a user", async () => {
			const userId = "user-123";
			mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

			const result = await service.markAllAsRead(userId);

			expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
				where: { userId, isRead: false },
				data: { isRead: true },
			});
			expect(result).toBe(5);
		});
	});

	describe("getUnreadCount", () => {
		it("should return the count of unread notifications", async () => {
			const userId = "user-123";
			mockPrisma.notification.count.mockResolvedValue(10);

			const result = await service.getUnreadCount(userId);

			expect(mockPrisma.notification.count).toHaveBeenCalledWith({
				where: { userId, isRead: false },
			});
			expect(result).toBe(10);
		});
	});

	describe("createBulk", () => {
		it("should create multiple notifications", async () => {
			const notifications = [
				{
					userId: "user-1",
					type: "ANNOUNCEMENT",
					title: "Test",
					message: "Test",
				},
				{
					userId: "user-2",
					type: "ANNOUNCEMENT",
					title: "Test",
					message: "Test",
				},
			];

			mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

			const result = await service.createBulk(notifications);

			expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
				data: notifications,
			});
			expect(result).toBe(2);
		});
	});

	describe("notifyAssignmentDue", () => {
		it("should create an assignment due notification", async () => {
			const params = {
				userId: "user-123",
				assignmentId: "assignment-456",
				assignmentTitle: "Math Homework",
				dueDate: new Date("2024-12-31"),
			};

			const mockNotification = {
				id: "notif-123",
				userId: params.userId,
				type: "ASSIGNMENT_DUE",
				title: "Assignment Due Soon",
			};

			mockPrisma.notification.create.mockResolvedValue(mockNotification);

			const result = await service.notifyAssignmentDue(params);

			expect(mockPrisma.notification.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					userId: params.userId,
					type: "ASSIGNMENT_DUE",
					title: "Assignment Due Soon",
					link: `/assignments/${params.assignmentId}`,
				}),
			});
			expect(result.type).toBe("ASSIGNMENT_DUE");
		});
	});

	describe("notifyGradePosted", () => {
		it("should create a grade posted notification", async () => {
			const params = {
				userId: "user-123",
				assignmentId: "assignment-456",
				assignmentTitle: "Math Test",
				score: 85,
				maxScore: 100,
			};

			const mockNotification = {
				id: "notif-123",
				userId: params.userId,
				type: "GRADE_POSTED",
				title: "Grade Posted",
			};

			mockPrisma.notification.create.mockResolvedValue(mockNotification);

			const result = await service.notifyGradePosted(params);

			expect(mockPrisma.notification.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					userId: params.userId,
					type: "GRADE_POSTED",
					title: "Grade Posted",
					message: expect.stringContaining("85/100"),
				}),
			});
			expect(result.type).toBe("GRADE_POSTED");
		});
	});

	describe("delete", () => {
		it("should delete a notification", async () => {
			const notificationId = "notif-123";
			const userId = "user-123";

			mockPrisma.notification.findFirst.mockResolvedValue({
				id: notificationId,
				userId,
			});
			mockPrisma.notification.delete.mockResolvedValue({ id: notificationId });

			const result = await service.delete(notificationId, userId);

			expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
				where: { id: notificationId },
			});
			expect(result).toBe(true);
		});

		it("should throw error when deleting non-existent notification", async () => {
			mockPrisma.notification.findFirst.mockResolvedValue(null);

			await expect(service.delete("invalid-id", "user-123")).rejects.toThrow(
				"Notification not found or access denied",
			);
		});
	});
});
