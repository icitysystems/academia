import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import {
	ProgressSummary,
	TeachingMethodDistribution,
	LessonReport,
	DashboardSummary,
} from "../models/lesson-tracking.models";

@Injectable()
export class AnalyticsService {
	constructor(private prisma: PrismaService) {}

	async getProgressSummary(classSubjectId: string): Promise<ProgressSummary> {
		const classSubject = await this.prisma.classSubject.findUnique({
			where: { id: classSubjectId },
			include: {
				class: true,
				subject: true,
				syllabus: {
					include: {
						units: {
							include: {
								chapters: {
									include: {
										topics: true,
									},
								},
							},
						},
					},
				},
				lessons: {
					include: {
						topics: true,
					},
				},
			},
		});

		if (!classSubject) {
			throw new Error("Class subject not found");
		}

		// Calculate total topics
		let totalTopics = 0;
		const allTopicIds = new Set<string>();
		const coveredTopicIds = new Set<string>();

		if (classSubject.syllabus) {
			for (const unit of classSubject.syllabus.units) {
				for (const chapter of unit.chapters) {
					for (const topic of chapter.topics) {
						allTopicIds.add(topic.id);
						totalTopics++;
					}
				}
			}
		}

		// Calculate covered topics and hours
		let hoursCompleted = 0;
		for (const lesson of classSubject.lessons) {
			hoursCompleted += lesson.duration;
			for (const lessonTopic of lesson.topics) {
				coveredTopicIds.add(lessonTopic.topicId);
			}
		}

		const coveredTopics = coveredTopicIds.size;
		const completionPercentage =
			totalTopics > 0 ? (coveredTopics / totalTopics) * 100 : 0;
		const lessonsCount = classSubject.lessons.length;
		const averageDuration =
			lessonsCount > 0 ? hoursCompleted / lessonsCount : 0;

		// Calculate if on track
		const totalHours = classSubject.totalHours || 0;
		const expectedProgress =
			totalHours > 0 ? (hoursCompleted / totalHours) * 100 : 0;
		const onTrack = completionPercentage >= expectedProgress * 0.9; // Within 10%

		// Project completion date
		let projectedCompletionDate: Date | undefined;
		if (classSubject.endDate && totalHours > 0 && hoursCompleted > 0) {
			const remainingHours = totalHours - hoursCompleted;
			const weeksElapsed = this.getWeeksElapsed(
				classSubject.startDate || new Date(),
				new Date(),
			);
			const hoursPerWeek = weeksElapsed > 0 ? hoursCompleted / weeksElapsed : 0;

			if (hoursPerWeek > 0) {
				const weeksRemaining = remainingHours / hoursPerWeek;
				projectedCompletionDate = new Date();
				projectedCompletionDate.setDate(
					projectedCompletionDate.getDate() + weeksRemaining * 7,
				);
			}
		}

		return {
			classSubjectId: classSubject.id,
			subjectName: classSubject.subject.name,
			className: classSubject.class.name,
			totalTopics,
			coveredTopics,
			completionPercentage,
			totalHours,
			hoursCompleted,
			lessonsCount,
			averageDuration,
			onTrack,
			projectedCompletionDate,
		};
	}

	async getLessonReport(filters: {
		teacherId?: string;
		schoolId?: string;
		classId?: string;
		subjectId?: string;
		classSubjectId?: string;
		dateFrom: Date;
		dateTo: Date;
	}): Promise<LessonReport> {
		const where: any = {
			date: {
				gte: filters.dateFrom,
				lte: filters.dateTo,
			},
		};

		if (filters.teacherId) {
			where.teacherId = filters.teacherId;
		}

		if (filters.classId) {
			where.classId = filters.classId;
		}

		if (filters.classSubjectId) {
			where.classSubjectId = filters.classSubjectId;
		}

		if (filters.schoolId) {
			where.class = {
				schoolId: filters.schoolId,
			};
		}

		const lessons = await this.prisma.lesson.findMany({
			where,
			include: {
				class: {
					include: {
						school: true,
					},
				},
				classSubject: {
					include: {
						subject: true,
					},
				},
				topics: {
					include: {
						topic: true,
					},
				},
			},
		});

		const totalLessons = lessons.length;
		const totalHours = lessons.reduce(
			(sum, lesson) => sum + lesson.duration,
			0,
		);

		const uniqueClasses = new Set(lessons.map((l) => l.classId));
		const uniqueSubjects = new Set(
			lessons.map((l) => l.classSubject.subjectId),
		);
		const uniqueTopics = new Set();

		lessons.forEach((lesson) => {
			lesson.topics.forEach((lt) => uniqueTopics.add(lt.topicId));
		});

		// Calculate method distribution
		const methodCounts = new Map<string, { count: number; hours: number }>();

		lessons.forEach((lesson) => {
			if (lesson.teachingMethod) {
				const current = methodCounts.get(lesson.teachingMethod) || {
					count: 0,
					hours: 0,
				};
				methodCounts.set(lesson.teachingMethod, {
					count: current.count + 1,
					hours: current.hours + lesson.duration,
				});
			}
		});

		const methodDistribution: TeachingMethodDistribution[] = Array.from(
			methodCounts.entries(),
		).map(([method, data]) => ({
			method: method as any,
			count: data.count,
			percentage: (data.count / totalLessons) * 100,
			totalHours: data.hours,
		}));

		// Get progress summaries for unique class subjects
		const classSubjectIds = new Set(lessons.map((l) => l.classSubjectId));
		const progressSummaries: ProgressSummary[] = [];

		for (const csId of classSubjectIds) {
			try {
				const summary = await this.getProgressSummary(csId as string);
				progressSummaries.push(summary);
			} catch (error) {
				// Skip if error
			}
		}

		return {
			dateRange: {
				start: filters.dateFrom,
				end: filters.dateTo,
			},
			totalLessons,
			totalHours,
			classesTaught: uniqueClasses.size,
			subjectsTaught: uniqueSubjects.size,
			topicsCovered: uniqueTopics.size,
			methodDistribution,
			progressSummaries,
		};
	}

	async getDashboardSummary(userId: string) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const nextWeek = new Date(today);
		nextWeek.setDate(nextWeek.getDate() + 7);

		const weekStart = new Date(today);
		weekStart.setDate(weekStart.getDate() - today.getDay());

		// Get today's lessons
		const todayLessons = await this.prisma.lesson.findMany({
			where: {
				teacherId: userId,
				date: {
					gte: today,
					lt: tomorrow,
				},
			},
			include: {
				class: {
					include: {
						school: true,
					},
				},
				classSubject: {
					include: {
						subject: true,
					},
				},
				topics: {
					include: {
						topic: true,
					},
				},
				attachments: true,
			},
			orderBy: { date: "asc" },
		});

		// Get upcoming lessons (next 7 days, excluding today)
		const upcomingLessons = await this.prisma.lesson.findMany({
			where: {
				teacherId: userId,
				date: {
					gte: tomorrow,
					lt: nextWeek,
				},
				status: {
					in: ["PLANNED", "IN_PROGRESS"],
				},
			},
			include: {
				class: {
					include: {
						school: true,
					},
				},
				classSubject: {
					include: {
						subject: true,
					},
				},
				topics: {
					include: {
						topic: true,
					},
				},
				attachments: true,
			},
			orderBy: { date: "asc" },
			take: 10,
		});

		// Calculate week progress
		const weekLessons = await this.prisma.lesson.findMany({
			where: {
				teacherId: userId,
				date: {
					gte: weekStart,
					lt: nextWeek,
				},
			},
		});

		const weekProgress =
			weekLessons.length > 0
				? (weekLessons.filter((l) => l.status === "COMPLETED").length /
						weekLessons.length) *
				  100
				: 0;

		// Count alerts (incomplete lessons, overdue planned lessons)
		const alertsCount = await this.prisma.lesson.count({
			where: {
				teacherId: userId,
				OR: [
					{
						status: "IN_PROGRESS",
						date: {
							lt: today,
						},
					},
					{
						status: "PLANNED",
						date: {
							lt: today,
						},
					},
				],
			},
		});

		// Get schools count
		const schoolsCount = await this.prisma.teacherSchool.count({
			where: { teacherId: userId },
		});

		// Get classes count
		const classesCount = await this.prisma.class.count({
			where: {
				status: "ACTIVE",
				school: {
					teachers: {
						some: {
							teacherId: userId,
						},
					},
				},
			},
		});

		// Get recent progress summaries
		const classSubjects = await this.prisma.classSubject.findMany({
			where: { teacherId: userId },
			take: 5,
			orderBy: { updatedAt: "desc" },
		});

		const recentProgress: ProgressSummary[] = [];
		for (const cs of classSubjects) {
			try {
				const summary = await this.getProgressSummary(cs.id);
				recentProgress.push(summary);
			} catch (error) {
				// Skip if error
			}
		}

		return {
			todayLessons,
			upcomingLessons,
			weekProgress,
			alertsCount,
			schoolsCount,
			classesCount,
			recentProgress,
		};
	}

	private getWeeksElapsed(startDate: Date, endDate: Date): number {
		const msPerWeek = 7 * 24 * 60 * 60 * 1000;
		return Math.floor((endDate.getTime() - startDate.getTime()) / msPerWeek);
	}

	async exportReport(
		userId: string,
		input: {
			schoolId?: string;
			classId?: string;
			classSubjectId?: string;
			dateFrom: Date;
			dateTo: Date;
			format: "PDF" | "EXCEL" | "CSV";
		},
	): Promise<string> {
		// Build filter for lessons based on input criteria
		const where: any = {
			teacherId: userId,
			date: {
				gte: input.dateFrom,
				lte: input.dateTo,
			},
		};

		if (input.classId) {
			where.classId = input.classId;
		}

		if (input.classSubjectId) {
			where.classSubjectId = input.classSubjectId;
		}

		if (input.schoolId) {
			where.class = {
				schoolId: input.schoolId,
			};
		}

		// Fetch lessons with all related data
		const lessons = await this.prisma.lesson.findMany({
			where,
			include: {
				class: {
					include: {
						school: true,
					},
				},
				classSubject: {
					include: {
						subject: true,
					},
				},
				topics: {
					include: {
						topic: {
							include: {
								chapter: {
									include: {
										unit: true,
									},
								},
							},
						},
					},
				},
				attachments: true,
			},
			orderBy: {
				date: "asc",
			},
		});

		// Calculate summary statistics
		const totalLessons = lessons.length;
		const totalHours = lessons.reduce((sum, l) => sum + l.duration, 0);
		const uniqueTopics = new Set(
			lessons.flatMap((l) => l.topics.map((t) => t.topicId)),
		).size;

		// Group by subject
		const bySubject: Record<
			string,
			{ name: string; lessons: number; hours: number }
		> = {};
		for (const lesson of lessons) {
			const subjectName =
				lesson.classSubject?.subject?.name || "Unknown Subject";
			if (!bySubject[subjectName]) {
				bySubject[subjectName] = { name: subjectName, lessons: 0, hours: 0 };
			}
			bySubject[subjectName].lessons++;
			bySubject[subjectName].hours += lesson.duration;
		}

		// Generate report data based on format
		const reportData = {
			generatedAt: new Date().toISOString(),
			period: {
				from: input.dateFrom.toISOString(),
				to: input.dateTo.toISOString(),
			},
			summary: {
				totalLessons,
				totalHours,
				uniqueTopicsCovered: uniqueTopics,
				subjectBreakdown: Object.values(bySubject),
			},
			lessons: lessons.map((l) => ({
				id: l.id,
				date: l.date.toISOString(),
				subject: l.classSubject?.subject?.name || "Unknown",
				class: l.class?.name || "Unknown",
				school: l.class?.school?.name || "Unknown",
				duration: l.duration,
				method: l.teachingMethod,
				topicsCovered: l.topics.map(
					(t) =>
						`${t.topic?.chapter?.unit?.title || ""} > ${
							t.topic?.chapter?.title || ""
						} > ${t.topic?.title || ""}`,
				),
				notes: l.notes,
				objectives: (l as any).objectives,
				status: l.status,
			})),
		};

		// Return formatted report based on requested format
		switch (input.format) {
			case "CSV":
				return this.generateCSV(reportData);
			case "EXCEL":
				// Return JSON that can be converted to Excel on frontend
				return JSON.stringify(reportData, null, 2);
			case "PDF":
			default:
				// Return JSON that can be used to generate PDF on frontend
				return JSON.stringify(reportData, null, 2);
		}
	}

	private generateCSV(reportData: any): string {
		const headers = [
			"Date",
			"Subject",
			"Class",
			"School",
			"Duration (hrs)",
			"Method",
			"Topics Covered",
			"Notes",
			"Status",
		];

		const rows = reportData.lessons.map((l: any) => [
			l.date,
			l.subject,
			l.class,
			l.school,
			l.duration,
			l.method,
			l.topicsCovered.join("; "),
			(l.notes || "").replace(/"/g, '""'),
			l.status,
		]);

		const csvContent = [
			// Summary header
			`Lesson Tracking Report`,
			`Generated: ${reportData.generatedAt}`,
			`Period: ${reportData.period.from} to ${reportData.period.to}`,
			`Total Lessons: ${reportData.summary.totalLessons}`,
			`Total Hours: ${reportData.summary.totalHours}`,
			`Topics Covered: ${reportData.summary.uniqueTopicsCovered}`,
			"",
			// Data headers
			headers.join(","),
			// Data rows
			...rows.map((row: any[]) =>
				row.map((cell) => `"${String(cell || "")}"`).join(","),
			),
		].join("\n");

		return csvContent;
	}
}
