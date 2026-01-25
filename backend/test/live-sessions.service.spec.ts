import { Test, TestingModule } from "@nestjs/testing";
import { LiveSessionsService } from "../src/live-sessions/live-sessions.service";
import { PrismaService } from "../src/prisma.service";

describe("LiveSessionsService", () => {
	let service: LiveSessionsService;
	let prisma: PrismaService;

	const mockPrisma = {
		liveSession: {
			create: jest.fn(),
			findUnique: jest.fn(),
			findMany: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
		},
		sessionParticipant: {
			create: jest.fn(),
			findFirst: jest.fn(),
			update: jest.fn(),
			findMany: jest.fn(),
		},
		enrollment: {
			findFirst: jest.fn(),
		},
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LiveSessionsService,
				{
					provide: PrismaService,
					useValue: mockPrisma,
				},
			],
		}).compile();

		service = module.get<LiveSessionsService>(LiveSessionsService);
		prisma = module.get<PrismaService>(PrismaService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("create", () => {
		it("should create a live session", async () => {
			const sessionData = {
				title: "Math Lecture",
				description: "Introduction to Algebra",
				hostId: "instructor-123",
				courseId: "course-456",
				scheduledStart: new Date("2024-12-20T10:00:00Z"),
				scheduledEnd: new Date("2024-12-20T11:00:00Z"),
				maxParticipants: 50,
			};

			const mockSession = {
				id: "session-123",
				...sessionData,
				status: "SCHEDULED",
				roomId: expect.any(String),
			};

			mockPrisma.liveSession.create.mockResolvedValue(mockSession);

			const result = await service.create(sessionData);

			expect(mockPrisma.liveSession.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					title: sessionData.title,
					hostId: sessionData.hostId,
					courseId: sessionData.courseId,
					status: "SCHEDULED",
				}),
				include: expect.any(Object),
			});
			expect(result.status).toBe("SCHEDULED");
		});
	});

	describe("findById", () => {
		it("should return a session with details", async () => {
			const sessionId = "session-123";
			const mockSession = {
				id: sessionId,
				title: "Test Session",
				host: { id: "host-1", name: "Prof Smith" },
				participants: [],
			};

			mockPrisma.liveSession.findUnique.mockResolvedValue(mockSession);

			const result = await service.findById(sessionId);

			expect(mockPrisma.liveSession.findUnique).toHaveBeenCalledWith({
				where: { id: sessionId },
				include: expect.any(Object),
			});
			expect(result).toEqual(mockSession);
		});

		it("should return null when session not found", async () => {
			mockPrisma.liveSession.findUnique.mockResolvedValue(null);

			const result = await service.findById("invalid-id");

			expect(result).toBeNull();
		});
	});

	describe("startSession", () => {
		it("should start a scheduled session", async () => {
			const sessionId = "session-123";
			const hostId = "host-123";

			mockPrisma.liveSession.findUnique.mockResolvedValue({
				id: sessionId,
				hostId,
				status: "SCHEDULED",
			});

			const updatedSession = {
				id: sessionId,
				status: "LIVE",
				actualStart: expect.any(Date),
			};

			mockPrisma.liveSession.update.mockResolvedValue(updatedSession);

			const result = await service.startSession(sessionId, hostId);

			expect(mockPrisma.liveSession.update).toHaveBeenCalledWith({
				where: { id: sessionId },
				data: {
					status: "LIVE",
					actualStart: expect.any(Date),
				},
				include: expect.any(Object),
			});
			expect(result.status).toBe("LIVE");
		});

		it("should throw error when session not found", async () => {
			mockPrisma.liveSession.findUnique.mockResolvedValue(null);

			await expect(
				service.startSession("invalid-id", "host-123"),
			).rejects.toThrow("Session not found");
		});

		it("should throw error when user is not the host", async () => {
			mockPrisma.liveSession.findUnique.mockResolvedValue({
				id: "session-123",
				hostId: "other-host",
				status: "SCHEDULED",
			});

			await expect(
				service.startSession("session-123", "wrong-host"),
			).rejects.toThrow("Only the host can start the session");
		});

		it("should throw error when session is not in scheduled status", async () => {
			mockPrisma.liveSession.findUnique.mockResolvedValue({
				id: "session-123",
				hostId: "host-123",
				status: "LIVE",
			});

			await expect(
				service.startSession("session-123", "host-123"),
			).rejects.toThrow("Session cannot be started");
		});
	});

	describe("endSession", () => {
		it("should end a live session", async () => {
			const sessionId = "session-123";
			const hostId = "host-123";

			mockPrisma.liveSession.findUnique.mockResolvedValue({
				id: sessionId,
				hostId,
				status: "LIVE",
			});

			// Mock updating all active participants
			mockPrisma.sessionParticipant.findMany.mockResolvedValue([
				{ id: "p1", leftAt: null },
			]);
			mockPrisma.sessionParticipant.update.mockResolvedValue({});

			const endedSession = {
				id: sessionId,
				status: "ENDED",
				actualEnd: new Date(),
			};

			mockPrisma.liveSession.update.mockResolvedValue(endedSession);

			const result = await service.endSession(sessionId, hostId);

			expect(result.status).toBe("ENDED");
		});
	});

	describe("joinSession", () => {
		it("should allow a user to join a live session", async () => {
			const sessionId = "session-123";
			const userId = "user-123";

			mockPrisma.liveSession.findUnique.mockResolvedValue({
				id: sessionId,
				status: "LIVE",
				hostId: "host-456",
				maxParticipants: 50,
				courseId: "course-789",
				_count: { participants: 10 },
			});

			mockPrisma.enrollment.findFirst.mockResolvedValue({
				id: "enroll-1",
				studentId: userId,
			});

			mockPrisma.sessionParticipant.findFirst.mockResolvedValue(null);

			const participant = {
				id: "participant-123",
				sessionId,
				userId,
				role: "PARTICIPANT",
				joinedAt: new Date(),
			};

			mockPrisma.sessionParticipant.create.mockResolvedValue(participant);

			const result = await service.joinSession(sessionId, userId);

			expect(result).toHaveProperty("participantId");
			expect(result).toHaveProperty("roomId");
			expect(result).toHaveProperty("iceServers");
		});

		it("should throw error when session is not live", async () => {
			mockPrisma.liveSession.findUnique.mockResolvedValue({
				id: "session-123",
				status: "SCHEDULED",
			});

			await expect(
				service.joinSession("session-123", "user-123"),
			).rejects.toThrow("Session is not currently live");
		});

		it("should throw error when session is full", async () => {
			mockPrisma.liveSession.findUnique.mockResolvedValue({
				id: "session-123",
				status: "LIVE",
				maxParticipants: 10,
				_count: { participants: 10 },
			});

			await expect(
				service.joinSession("session-123", "user-123"),
			).rejects.toThrow("Session is full");
		});
	});

	describe("leaveSession", () => {
		it("should allow a user to leave a session", async () => {
			const sessionId = "session-123";
			const userId = "user-123";

			mockPrisma.sessionParticipant.findFirst.mockResolvedValue({
				id: "participant-123",
				sessionId,
				userId,
				leftAt: null,
			});

			mockPrisma.sessionParticipant.update.mockResolvedValue({
				id: "participant-123",
				leftAt: new Date(),
			});

			const result = await service.leaveSession(sessionId, userId);

			expect(mockPrisma.sessionParticipant.update).toHaveBeenCalledWith({
				where: { id: "participant-123" },
				data: { leftAt: expect.any(Date) },
			});
			expect(result).toBe(true);
		});

		it("should return false when participant not found", async () => {
			mockPrisma.sessionParticipant.findFirst.mockResolvedValue(null);

			const result = await service.leaveSession("session-123", "user-123");

			expect(result).toBe(false);
		});
	});

	describe("getUpcomingSessions", () => {
		it("should return upcoming sessions for a course", async () => {
			const courseId = "course-123";
			const mockSessions = [
				{ id: "1", title: "Session 1", status: "SCHEDULED" },
				{ id: "2", title: "Session 2", status: "SCHEDULED" },
			];

			mockPrisma.liveSession.findMany.mockResolvedValue(mockSessions);

			const result = await service.getUpcomingSessions(courseId);

			expect(mockPrisma.liveSession.findMany).toHaveBeenCalledWith({
				where: {
					courseId,
					status: { in: ["SCHEDULED", "LIVE"] },
					scheduledStart: { gte: expect.any(Date) },
				},
				orderBy: { scheduledStart: "asc" },
				include: expect.any(Object),
			});
			expect(result).toHaveLength(2);
		});
	});

	describe("cancelSession", () => {
		it("should cancel a scheduled session", async () => {
			const sessionId = "session-123";
			const hostId = "host-123";

			mockPrisma.liveSession.findUnique.mockResolvedValue({
				id: sessionId,
				hostId,
				status: "SCHEDULED",
			});

			const cancelledSession = {
				id: sessionId,
				status: "CANCELLED",
			};

			mockPrisma.liveSession.update.mockResolvedValue(cancelledSession);

			const result = await service.cancelSession(sessionId, hostId);

			expect(result.status).toBe("CANCELLED");
		});

		it("should throw error when trying to cancel a live session", async () => {
			mockPrisma.liveSession.findUnique.mockResolvedValue({
				id: "session-123",
				hostId: "host-123",
				status: "LIVE",
			});

			await expect(
				service.cancelSession("session-123", "host-123"),
			).rejects.toThrow("Cannot cancel a live session. End it instead.");
		});
	});
});
