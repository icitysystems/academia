import {
	Injectable,
	Logger,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { NotificationDeliveryService } from "../notifications/notification-delivery.service";

/**
 * Lesson Plan Sharing Service
 * Implements sharing of lesson plans and schemes between instructors
 */

// Helper to parse extended lesson data from notes JSON
function parseLessonNotes(notes: string | null): {
	topicTitle?: string;
	objectives?: string[];
	activities?: string[];
	resources?: string[];
} {
	if (!notes) return {};
	try {
		const parsed = JSON.parse(notes);
		return parsed.extendedData || {};
	} catch {
		return {};
	}
}

export interface ShareLessonPlanInput {
	lessonId?: string;
	schemeId?: string;
	sharedWithId?: string; // Specific user
	sharedWithRole?: string; // Role-based sharing
	permissions: "VIEW" | "EDIT" | "COPY";
	message?: string;
	isPublic?: boolean;
	expiresInDays?: number;
}

export interface SharedPlanResult {
	id: string;
	shareLink: string;
	sharedWith?: string;
	permissions: string;
	expiresAt?: Date;
}

@Injectable()
export class LessonPlanSharingService {
	private readonly logger = new Logger(LessonPlanSharingService.name);

	constructor(
		private prisma: PrismaService,
		private notificationService: NotificationDeliveryService,
	) {}

	/**
	 * Share a lesson plan with another user or make it public
	 */
	async shareLessonPlan(
		ownerId: string,
		input: ShareLessonPlanInput,
	): Promise<SharedPlanResult> {
		// Validate that either lessonId or schemeId is provided
		if (!input.lessonId && !input.schemeId) {
			throw new BadRequestException(
				"Either lessonId or schemeId must be provided",
			);
		}

		// Verify ownership
		if (input.lessonId) {
			const lesson = await this.prisma.lesson.findFirst({
				where: { id: input.lessonId, teacherId: ownerId },
			});
			if (!lesson) {
				throw new NotFoundException("Lesson not found or unauthorized");
			}
		}

		if (input.schemeId) {
			const scheme = await this.prisma.schemeOfWork.findFirst({
				where: { id: input.schemeId, generatedById: ownerId },
			});
			if (!scheme) {
				throw new NotFoundException("Scheme of work not found or unauthorized");
			}
		}

		// Calculate expiration date
		const expiresAt = input.expiresInDays
			? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
			: null;

		// Create the share record
		const shared = await this.prisma.sharedLessonPlan.create({
			data: {
				lessonId: input.lessonId,
				schemeId: input.schemeId,
				ownerId,
				sharedWithId: input.sharedWithId,
				sharedWithRole: input.sharedWithRole,
				permissions: input.permissions,
				message: input.message,
				isPublic: input.isPublic || false,
				expiresAt,
			},
		});

		// Send notification to shared user
		if (input.sharedWithId) {
			const owner = await this.prisma.user.findUnique({
				where: { id: ownerId },
				select: { name: true },
			});

			await this.notificationService.deliverNotification(input.sharedWithId, {
				type: "LESSON_PLAN_SHARED",
				title: "Lesson Plan Shared With You",
				message: `${owner?.name || "A colleague"} has shared a lesson plan with you`,
				link: `/shared-plans/${shared.id}`,
				metadata: { shareId: shared.id },
			});
		}

		// Generate share link
		const shareLink = `/shared-plans/${shared.id}`;

		return {
			id: shared.id,
			shareLink,
			sharedWith: input.sharedWithId,
			permissions: input.permissions,
			expiresAt: expiresAt || undefined,
		};
	}

	/**
	 * Get shared plans received by a user
	 */
	async getReceivedSharedPlans(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { role: true },
		});

		const plans = await this.prisma.sharedLessonPlan.findMany({
			where: {
				OR: [
					{ sharedWithId: userId },
					{ sharedWithRole: user?.role },
					{ isPublic: true },
				],
				AND: [
					{
						OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
					},
				],
			},
			orderBy: { createdAt: "desc" },
			include: {
				owner: { select: { id: true, name: true, avatarUrl: true } },
			},
		});

		// Enrich with lesson/scheme details
		return Promise.all(
			plans.map(async (plan) => {
				let details: any = {};

				if (plan.lessonId) {
					const lesson = await this.prisma.lesson.findUnique({
						where: { id: plan.lessonId },
						include: {
							classSubject: {
								include: {
									subject: true,
									class: true,
								},
							},
						},
					});
					const lessonData = parseLessonNotes(lesson?.notes);
					details = {
						type: "LESSON",
						title: lessonData.topicTitle || "Untitled Lesson",
						subject: lesson?.classSubject?.subject?.name,
						class: lesson?.classSubject?.class?.name,
						date: lesson?.date,
					};
				}

				if (plan.schemeId) {
					const scheme = await this.prisma.schemeOfWork.findUnique({
						where: { id: plan.schemeId },
						include: {
							syllabus: {
								include: {
									classSubject: {
										include: { subject: true, class: true },
									},
								},
							},
						},
					});
					details = {
						type: "SCHEME",
						title: `Scheme - ${scheme?.syllabus?.classSubject?.subject?.name || "Unknown"}`,
						subject: scheme?.syllabus?.classSubject?.subject?.name,
						grade: scheme?.syllabus?.classSubject?.class?.gradeLevel,
					};
				}

				return {
					id: plan.id,
					...details,
					owner: plan.owner,
					permissions: plan.permissions,
					message: plan.message,
					sharedAt: plan.createdAt,
					expiresAt: plan.expiresAt,
					accessCount: plan.accessCount,
				};
			}),
		);
	}

	/**
	 * Get plans shared by a user
	 */
	async getSharedByMe(userId: string) {
		const plans = await this.prisma.sharedLessonPlan.findMany({
			where: { ownerId: userId },
			orderBy: { createdAt: "desc" },
			include: {
				sharedWith: { select: { id: true, name: true, avatarUrl: true } },
			},
		});

		return Promise.all(
			plans.map(async (plan) => {
				let details: any = {};

				if (plan.lessonId) {
					const lesson = await this.prisma.lesson.findUnique({
						where: { id: plan.lessonId },
						include: { classSubject: { include: { subject: true } } },
					});
					const lessonData = parseLessonNotes(lesson?.notes);
					details = {
						type: "LESSON",
						title: lessonData.topicTitle || "Untitled Lesson",
						subject: lesson?.classSubject?.subject?.name,
					};
				}

				if (plan.schemeId) {
					const scheme = await this.prisma.schemeOfWork.findUnique({
						where: { id: plan.schemeId },
						include: {
							syllabus: {
								include: {
									classSubject: { include: { subject: true } },
								},
							},
						},
					});
					details = {
						type: "SCHEME",
						title: `Scheme - ${scheme?.syllabus?.classSubject?.subject?.name || "Unknown"}`,
						subject: scheme?.syllabus?.classSubject?.subject?.name,
					};
				}

				return {
					id: plan.id,
					...details,
					sharedWith: plan.sharedWith,
					sharedWithRole: plan.sharedWithRole,
					permissions: plan.permissions,
					isPublic: plan.isPublic,
					sharedAt: plan.createdAt,
					expiresAt: plan.expiresAt,
					accessCount: plan.accessCount,
				};
			}),
		);
	}

	/**
	 * Access a shared lesson plan
	 */
	async accessSharedPlan(shareId: string, userId: string) {
		const share = await this.prisma.sharedLessonPlan.findUnique({
			where: { id: shareId },
			include: {
				owner: { select: { id: true, name: true } },
			},
		});

		if (!share) {
			throw new NotFoundException("Shared plan not found");
		}

		// Check if expired
		if (share.expiresAt && share.expiresAt < new Date()) {
			throw new ForbiddenException("This share link has expired");
		}

		// Check access permissions
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { role: true },
		});

		const hasAccess =
			share.isPublic ||
			share.sharedWithId === userId ||
			share.sharedWithRole === user?.role ||
			share.ownerId === userId;

		if (!hasAccess) {
			throw new ForbiddenException(
				"You do not have access to this shared plan",
			);
		}

		// Increment access count
		await this.prisma.sharedLessonPlan.update({
			where: { id: shareId },
			data: { accessCount: { increment: 1 } },
		});

		// Get the actual content
		let content: any = null;

		if (share.lessonId) {
			content = await this.prisma.lesson.findUnique({
				where: { id: share.lessonId },
				include: {
					classSubject: {
						include: {
							subject: true,
							class: true,
						},
					},
				},
			});
		}

		if (share.schemeId) {
			content = await this.prisma.schemeOfWork.findUnique({
				where: { id: share.schemeId },
			});
		}

		return {
			share: {
				id: share.id,
				owner: share.owner,
				permissions: share.permissions,
				message: share.message,
			},
			content,
			canEdit: share.permissions === "EDIT" && share.sharedWithId === userId,
			canCopy: share.permissions !== "VIEW",
		};
	}

	/**
	 * Copy a shared lesson plan to own collection
	 */
	async copySharedPlan(shareId: string, userId: string) {
		const access = await this.accessSharedPlan(shareId, userId);

		if (!access.canCopy) {
			throw new ForbiddenException(
				"You do not have permission to copy this plan",
			);
		}

		const share = await this.prisma.sharedLessonPlan.findUnique({
			where: { id: shareId },
		});

		if (!share) {
			throw new NotFoundException("Shared plan not found");
		}

		// Copy lesson
		if (share.lessonId && access.content) {
			const original = access.content;
			const originalData = parseLessonNotes(original.notes);

			// Build new notes with copied data
			const newNotes = JSON.stringify({
				extendedData: {
					topicTitle: `[Copy] ${originalData.topicTitle || "Untitled"}`,
					objectives: originalData.objectives || [],
					activities: originalData.activities || [],
					resources: originalData.resources || [],
				},
				text: original.notes ? JSON.parse(original.notes).text || "" : "",
			});

			const copied = await this.prisma.lesson.create({
				data: {
					teacherId: userId,
					classId: original.classId,
					classSubjectId: original.classSubjectId,
					date: new Date(),
					duration: original.duration,
					teachingMethod: original.teachingMethod,
					materialsUsed: original.materialsUsed,
					homeworkAssigned: original.homeworkAssigned,
					notes: newNotes,
					status: "PLANNED",
				},
			});

			return {
				type: "LESSON",
				id: copied.id,
				title: `[Copy] ${originalData.topicTitle || "Untitled"}`,
			};
		}

		// Copy scheme
		if (share.schemeId && access.content) {
			const original = access.content;
			// SchemeOfWork requires a syllabusId - for copies we need to reference the same syllabus
			const copied = await this.prisma.schemeOfWork.create({
				data: {
					syllabusId: original.syllabusId,
					generatedById: userId,
					term: original.term,
					academicYear: original.academicYear,
					weeklyPlans: original.weeklyPlans,
					totalWeeks: original.totalWeeks,
					status: "DRAFT",
				},
			});

			return { type: "SCHEME", id: copied.id, title: `Copied Scheme` };
		}

		throw new BadRequestException("Nothing to copy");
	}

	/**
	 * Revoke a share
	 */
	async revokeShare(shareId: string, ownerId: string) {
		const share = await this.prisma.sharedLessonPlan.findFirst({
			where: { id: shareId, ownerId },
		});

		if (!share) {
			throw new NotFoundException("Share not found or unauthorized");
		}

		await this.prisma.sharedLessonPlan.delete({ where: { id: shareId } });
		return { success: true };
	}

	/**
	 * Get public lesson plans (library)
	 */
	async getPublicLessonPlans(options: {
		subject?: string;
		grade?: string;
		skip?: number;
		take?: number;
	}) {
		const { subject, grade, skip = 0, take = 20 } = options;

		// Get public shares
		const shares = await this.prisma.sharedLessonPlan.findMany({
			where: {
				isPublic: true,
				OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			},
			orderBy: { accessCount: "desc" },
			skip,
			take,
			include: {
				owner: { select: { id: true, name: true, avatarUrl: true } },
			},
		});

		// Enrich with content
		const enriched = await Promise.all(
			shares.map(async (share) => {
				let details: any = {};

				if (share.lessonId) {
					const lesson = await this.prisma.lesson.findUnique({
						where: { id: share.lessonId },
						include: {
							classSubject: { include: { subject: true, class: true } },
						},
					});
					const lessonData = parseLessonNotes(lesson?.notes);
					details = {
						type: "LESSON",
						title: lessonData.topicTitle || "Untitled Lesson",
						subject: lesson?.classSubject?.subject?.name,
						class: lesson?.classSubject?.class?.name,
						grade: lesson?.classSubject?.class?.gradeLevel,
					};
				}

				if (share.schemeId) {
					const scheme = await this.prisma.schemeOfWork.findUnique({
						where: { id: share.schemeId },
						include: {
							syllabus: {
								include: {
									classSubject: { include: { subject: true, class: true } },
								},
							},
						},
					});
					details = {
						type: "SCHEME",
						title: `Scheme - ${scheme?.syllabus?.classSubject?.subject?.name || "Unknown"}`,
						subject: scheme?.syllabus?.classSubject?.subject?.name,
						grade: scheme?.syllabus?.classSubject?.class?.gradeLevel,
					};
				}

				return {
					id: share.id,
					...details,
					owner: share.owner,
					sharedAt: share.createdAt,
					accessCount: share.accessCount,
				};
			}),
		);

		// Filter by subject/grade if specified
		return enriched.filter((item) => {
			if (subject && item.subject?.toLowerCase() !== subject.toLowerCase())
				return false;
			if (grade && item.grade?.toLowerCase() !== grade.toLowerCase())
				return false;
			return true;
		});
	}
}
