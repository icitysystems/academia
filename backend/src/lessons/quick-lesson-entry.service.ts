import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

/**
 * Quick Lesson Entry Service
 * Implements rapid lesson logging for teachers
 * Allows fast entry of lesson data with minimal required fields
 *
 * Note: Fields are stored in the Lesson model as follows:
 * - topicTitle, objectives, activities, resources → stored in `notes` as JSON
 * - homework → stored in `homeworkAssigned`
 * - attendance → stored in `attendance` as JSON
 */

export interface QuickLessonInput {
	// Required fields
	classSubjectId: string;
	date: Date;
	topicTitle: string;

	// Optional fields - can be filled later
	duration?: number; // in hours (matching schema)
	objectives?: string[];
	activities?: string[];
	homework?: string;
	notes?: string;
	resources?: string[];
	teachingMethod?: string;
	materialsUsed?: string[];
	attendance?: {
		present: number;
		absent: number;
		total: number;
	};
	topicsIds?: string[]; // Link to syllabus topics
}

export interface QuickLessonBatchInput {
	lessons: QuickLessonInput[];
	fillGaps?: boolean; // Auto-fill missing lessons between dates
}

export interface LessonTemplate {
	id: string;
	name: string;
	topicTitle: string;
	objectives: string[];
	activities: string[];
	duration: number;
	resources: string[];
}

/**
 * Helper to build extended notes JSON containing topicTitle, objectives, activities, resources
 */
function buildExtendedNotes(input: {
	topicTitle?: string;
	objectives?: string[];
	activities?: string[];
	resources?: string[];
	notes?: string;
}): string {
	return JSON.stringify({
		topicTitle: input.topicTitle || "",
		objectives: input.objectives || [],
		activities: input.activities || [],
		resources: input.resources || [],
		additionalNotes: input.notes || "",
	});
}

/**
 * Helper to parse extended notes JSON
 */
function parseExtendedNotes(notes: string | null): {
	topicTitle: string;
	objectives: string[];
	activities: string[];
	resources: string[];
	additionalNotes: string;
} {
	if (!notes) {
		return {
			topicTitle: "",
			objectives: [],
			activities: [],
			resources: [],
			additionalNotes: "",
		};
	}
	try {
		return JSON.parse(notes);
	} catch {
		// Legacy plain text notes
		return {
			topicTitle: "",
			objectives: [],
			activities: [],
			resources: [],
			additionalNotes: notes,
		};
	}
}

@Injectable()
export class QuickLessonEntryService {
	private readonly logger = new Logger(QuickLessonEntryService.name);

	constructor(private prisma: PrismaService) {}

	/**
	 * Create a single quick lesson entry
	 */
	async createQuickLesson(teacherId: string, input: QuickLessonInput) {
		// Verify teacher has access to this class subject
		const classSubject = await this.prisma.classSubject.findFirst({
			where: {
				id: input.classSubjectId,
				teacherId,
			},
			include: {
				subject: true,
				class: true,
			},
		});

		if (!classSubject) {
			throw new Error("Class subject not found or unauthorized");
		}

		// Check for existing lesson on same date
		const existing = await this.prisma.lesson.findFirst({
			where: {
				classSubjectId: input.classSubjectId,
				date: input.date,
			},
		});

		// Build extended notes JSON
		const extendedNotes = buildExtendedNotes({
			topicTitle: input.topicTitle,
			objectives: input.objectives,
			activities: input.activities,
			resources: input.resources,
			notes: input.notes,
		});

		// Build attendance JSON
		const attendanceJson = input.attendance
			? JSON.stringify(input.attendance)
			: null;

		if (existing) {
			// Merge with existing notes
			const existingNotes = parseExtendedNotes(existing.notes);
			const mergedNotes = buildExtendedNotes({
				topicTitle: input.topicTitle || existingNotes.topicTitle,
				objectives: input.objectives || existingNotes.objectives,
				activities: input.activities || existingNotes.activities,
				resources: input.resources || existingNotes.resources,
				notes: input.notes || existingNotes.additionalNotes,
			});

			// Update existing lesson
			return this.prisma.lesson.update({
				where: { id: existing.id },
				data: {
					duration:
						input.duration !== undefined ? input.duration : existing.duration,
					notes: mergedNotes,
					homeworkAssigned: input.homework || existing.homeworkAssigned,
					teachingMethod: input.teachingMethod || existing.teachingMethod,
					materialsUsed: input.materialsUsed
						? JSON.stringify(input.materialsUsed)
						: existing.materialsUsed,
					attendance: attendanceJson || existing.attendance,
					updatedAt: new Date(),
				},
			});
		}

		// Create new lesson
		return this.prisma.lesson.create({
			data: {
				teacherId,
				classSubjectId: input.classSubjectId,
				classId: classSubject.classId,
				date: input.date,
				duration: input.duration || 0.75, // Default 45 minutes = 0.75 hours
				notes: extendedNotes,
				homeworkAssigned: input.homework,
				teachingMethod: input.teachingMethod || "LECTURE",
				materialsUsed: input.materialsUsed
					? JSON.stringify(input.materialsUsed)
					: null,
				attendance: attendanceJson,
				status: "COMPLETED",
			},
		});
	}

	/**
	 * Create multiple lessons in batch
	 */
	async createQuickLessonBatch(
		teacherId: string,
		input: QuickLessonBatchInput,
	) {
		const results = {
			created: 0,
			updated: 0,
			failed: 0,
			errors: [] as string[],
		};

		for (const lesson of input.lessons) {
			try {
				await this.createQuickLesson(teacherId, lesson);
				results.created++;
			} catch (error: any) {
				results.failed++;
				results.errors.push(`${lesson.date}: ${error.message}`);
			}
		}

		return results;
	}

	/**
	 * Get suggested topics based on syllabus/scheme of work
	 */
	async getSuggestedTopics(classSubjectId: string, date: Date) {
		const classSubject = await this.prisma.classSubject.findUnique({
			where: { id: classSubjectId },
			include: {
				subject: true,
			},
		});

		if (!classSubject) {
			return [];
		}

		// Get scheme of work topics through syllabus relation
		const schemes = await this.prisma.schemeOfWork.findMany({
			where: {
				syllabus: {
					classSubject: {
						subject: { name: classSubject.subject.name },
					},
				},
				status: "APPROVED",
			},
			orderBy: { createdAt: "desc" },
			take: 1,
		});

		if (schemes.length === 0) {
			return [];
		}

		// Parse topics from scheme weeklyPlans
		const scheme = schemes[0];
		let weeklyPlans: any[] = [];
		try {
			weeklyPlans = JSON.parse(scheme.weeklyPlans || "[]");
		} catch {
			weeklyPlans = [];
		}
		const topics: Array<{
			id: string;
			title: string;
			week: number;
			completed: boolean;
		}> = [];

		for (const week of weeklyPlans) {
			topics.push({
				id: `${scheme.id}-${week.weekNumber || week.week}`,
				title: week.topic || week.title || "Untitled Topic",
				week: week.weekNumber || week.week || 0,
				completed: false,
			});
		}

		// Check which topics have been covered (by parsing notes)
		const completedLessons = await this.prisma.lesson.findMany({
			where: { classSubjectId },
			select: { notes: true },
		});

		const completedTopics = new Set(
			completedLessons
				.map((l) => {
					const parsed = parseExtendedNotes(l.notes);
					return parsed.topicTitle?.toLowerCase();
				})
				.filter(Boolean),
		);
		topics.forEach((t) => {
			t.completed = completedTopics.has(t.title.toLowerCase());
		});

		// Return next uncompleted topics
		return topics.filter((t) => !t.completed).slice(0, 5);
	}

	/**
	 * Get recent lesson entries for quick copy
	 */
	async getRecentLessons(teacherId: string, limit = 10) {
		return this.prisma.lesson.findMany({
			where: { teacherId },
			orderBy: { date: "desc" },
			take: limit,
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

	/**
	 * Clone a lesson to a new date
	 */
	async cloneLesson(
		teacherId: string,
		lessonId: string,
		newDate: Date,
		newClassSubjectId?: string,
	) {
		const original = await this.prisma.lesson.findFirst({
			where: {
				id: lessonId,
				teacherId,
			},
			include: {
				classSubject: true,
			},
		});

		if (!original) {
			throw new Error("Lesson not found or unauthorized");
		}

		const targetClassSubjectId = newClassSubjectId || original.classSubjectId;

		// Get the classId for the target class subject
		let classId = original.classId;
		if (newClassSubjectId && newClassSubjectId !== original.classSubjectId) {
			const targetClassSubject = await this.prisma.classSubject.findUnique({
				where: { id: newClassSubjectId },
			});
			if (targetClassSubject) {
				classId = targetClassSubject.classId;
			}
		}

		return this.prisma.lesson.create({
			data: {
				teacherId,
				classSubjectId: targetClassSubjectId,
				classId,
				date: newDate,
				duration: original.duration,
				notes: original.notes, // Contains topicTitle, objectives, activities, resources
				homeworkAssigned: original.homeworkAssigned,
				teachingMethod: original.teachingMethod,
				materialsUsed: original.materialsUsed,
				status: "PLANNED",
			},
		});
	}

	/**
	 * Save a lesson as template for reuse
	 */
	async saveAsTemplate(
		teacherId: string,
		lessonId: string,
		templateName: string,
	) {
		const lesson = await this.prisma.lesson.findFirst({
			where: {
				id: lessonId,
				teacherId,
			},
		});

		if (!lesson) {
			throw new Error("Lesson not found or unauthorized");
		}

		// Parse extended notes to extract template data
		const parsedNotes = parseExtendedNotes(lesson.notes);

		// Store template in user preferences or dedicated table
		// For now, we'll use a simple approach with the LessonTemplate model
		const template = {
			name: templateName,
			topicTitle: parsedNotes.topicTitle,
			duration: lesson.duration,
			objectives: parsedNotes.objectives,
			activities: parsedNotes.activities,
			resources: parsedNotes.resources,
		};

		// Store in user preferences
		const user = await this.prisma.user.findUnique({
			where: { id: teacherId },
			select: { preferences: true },
		});

		const prefs = user?.preferences ? JSON.parse(user.preferences) : {};
		prefs.lessonTemplates = prefs.lessonTemplates || [];
		prefs.lessonTemplates.push({
			id: `template-${Date.now()}`,
			...template,
			createdAt: new Date(),
		});

		await this.prisma.user.update({
			where: { id: teacherId },
			data: {
				preferences: JSON.stringify(prefs),
			},
		});

		return template;
	}

	/**
	 * Get saved templates
	 */
	async getTemplates(teacherId: string): Promise<LessonTemplate[]> {
		const user = await this.prisma.user.findUnique({
			where: { id: teacherId },
			select: { preferences: true },
		});

		if (!user?.preferences) return [];

		const prefs = JSON.parse(user.preferences);
		return prefs.lessonTemplates || [];
	}

	/**
	 * Create lesson from template
	 */
	async createFromTemplate(
		teacherId: string,
		templateId: string,
		classSubjectId: string,
		date: Date,
	) {
		const templates = await this.getTemplates(teacherId);
		const template = templates.find((t) => t.id === templateId);

		if (!template) {
			throw new Error("Template not found");
		}

		return this.createQuickLesson(teacherId, {
			classSubjectId,
			date,
			topicTitle: template.topicTitle,
			duration: template.duration,
			objectives: template.objectives,
			activities: template.activities,
			resources: template.resources,
		});
	}

	/**
	 * Get teaching gaps (missing lessons)
	 */
	async getTeachingGaps(teacherId: string, startDate: Date, endDate: Date) {
		const classSubjects = await this.prisma.classSubject.findMany({
			where: { teacherId },
			include: {
				subject: true,
				class: true,
			},
		});

		const gaps: Array<{
			classSubjectId: string;
			className: string;
			subjectName: string;
			date: Date;
			expectedTopic?: string;
		}> = [];

		for (const cs of classSubjects) {
			// Get lessons in date range
			const lessons = await this.prisma.lesson.findMany({
				where: {
					classSubjectId: cs.id,
					date: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { date: "asc" },
			});

			// Get expected schedule (lessons per week based on weekly hours)
			const lessonsPerWeek = cs.weeklyHours || 2;
			const totalWeeks = Math.ceil(
				(endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
			);
			const expectedLessons = lessonsPerWeek * totalWeeks;

			// If we have fewer lessons than expected, there are gaps
			if (lessons.length < expectedLessons * 0.8) {
				// Allow 20% buffer
				// Find specific missing dates (simplified)
				const lessonDates = new Set(
					lessons.map((l) => l.date.toISOString().split("T")[0]),
				);
				const current = new Date(startDate);

				while (current <= endDate) {
					const dayOfWeek = current.getDay();
					// Skip weekends
					if (dayOfWeek !== 0 && dayOfWeek !== 6) {
						const dateStr = current.toISOString().split("T")[0];
						if (!lessonDates.has(dateStr)) {
							gaps.push({
								classSubjectId: cs.id,
								className: cs.class.name,
								subjectName: cs.subject.name,
								date: new Date(current),
							});
						}
					}
					current.setDate(current.getDate() + 1);
				}
			}
		}

		return gaps.slice(0, 20); // Limit to 20 gaps
	}

	/**
	 * Voice-to-lesson quick entry (parse spoken input)
	 */
	async parseVoiceInput(
		teacherId: string,
		transcript: string,
		classSubjectId: string,
	) {
		// Simple parsing of voice input
		const input: QuickLessonInput = {
			classSubjectId,
			date: new Date(),
			topicTitle: "",
		};

		// Extract date if mentioned
		const datePatterns = [
			/today/i,
			/yesterday/i,
			/(\d{1,2})\s*(st|nd|rd|th)?\s*of?\s*(\w+)/i,
			/(\w+)\s*(\d{1,2})/i,
		];

		if (transcript.match(/yesterday/i)) {
			input.date = new Date(Date.now() - 24 * 60 * 60 * 1000);
		}

		// Extract topic (usually after "taught" or "covered" or "lesson on")
		const topicPatterns = [
			/(?:taught|covered|lesson on|topic)\s+(.+?)(?:\.|,|$)/i,
			/(.+?)\s+(?:for|with)\s+(?:\d+|about)/i,
		];

		for (const pattern of topicPatterns) {
			const match = transcript.match(pattern);
			if (match) {
				input.topicTitle = match[1].trim();
				break;
			}
		}

		if (!input.topicTitle) {
			// Use first sentence as topic
			input.topicTitle = transcript.split(/[.,!?]/)[0].trim();
		}

		// Extract duration if mentioned
		const durationMatch = transcript.match(/(\d+)\s*(?:minutes?|mins?)/i);
		if (durationMatch) {
			input.duration = parseInt(durationMatch[1]);
		}

		return input;
	}
}
