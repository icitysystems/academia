import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AnalyticsService {
	constructor(private prisma: PrismaService) {}

	// ========== Learning Resources Dashboard Stats ==========

	async getLearningResourceStats(userId: string) {
		const [
			lessonPlanCount,
			questionCount,
			activeQuizCount,
			examPaperCount,
			recentActivity,
		] = await Promise.all([
			// Count schemes of work (lesson plans)
			this.prisma.schemeOfWork.count({
				where: { generatedById: userId },
			}),
			// Count questions in question bank
			this.prisma.questionBank.count({
				where: { createdById: userId },
			}),
			// Count active quizzes
			this.prisma.onlineQuiz.count({
				where: { createdById: userId, status: "PUBLISHED" },
			}),
			// Count exam papers
			this.prisma.examPaper.count({
				where: { createdById: userId },
			}),
			// Get recent activity
			this.prisma.activityLog.findMany({
				where: { userId },
				orderBy: { createdAt: "desc" },
				take: 10,
			}),
		]);

		// Update or create cached stats
		await this.prisma.learningResourceStats.upsert({
			where: { userId },
			create: {
				userId,
				lessonPlanCount,
				questionCount,
				activeQuizCount,
				examPaperCount,
				lastUpdated: new Date(),
			},
			update: {
				lessonPlanCount,
				questionCount,
				activeQuizCount,
				examPaperCount,
				lastUpdated: new Date(),
			},
		});

		return {
			lessonPlanCount,
			questionCount,
			activeQuizCount,
			examPaperCount,
			recentActivity,
		};
	}

	// ========== Student Analytics ==========

	async getStudentAnalytics(studentId: string, courseId?: string) {
		const enrollmentWhere: any = { studentId };
		if (courseId) {
			enrollmentWhere.courseId = courseId;
		}

		const [enrollments, quizAttempts, submissions] = await Promise.all([
			this.prisma.enrollment.findMany({
				where: enrollmentWhere,
				include: {
					course: { select: { id: true, title: true } },
					lessonProgress: true,
				},
			}),
			this.prisma.quizAttempt.findMany({
				where: { studentId },
				include: {
					quiz: { select: { id: true, title: true, totalMarks: true } },
				},
				orderBy: { submittedAt: "desc" },
				take: 20,
			}),
			this.prisma.assignmentSubmission.findMany({
				where: { studentId },
				include: {
					assignment: { select: { id: true, title: true, totalMarks: true } },
				},
				orderBy: { submittedAt: "desc" },
				take: 20,
			}),
		]);

		// Calculate overall progress
		const courseProgress = enrollments.map((enrollment) => {
			const totalLessons = enrollment.lessonProgress.length;
			const completedLessons = enrollment.lessonProgress.filter(
				(lp) => lp.status === "COMPLETED",
			).length;
			const avgProgress =
				totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

			return {
				courseId: enrollment.courseId,
				courseTitle: enrollment.course.title,
				enrollmentStatus: enrollment.status,
				progress: enrollment.progress,
				lessonsCompleted: completedLessons,
				totalLessons,
				avgProgress,
			};
		});

		// Quiz performance
		const quizPerformance = quizAttempts.map((attempt) => ({
			quizId: attempt.quizId,
			quizTitle: attempt.quiz.title,
			score: attempt.totalScore,
			maxScore: attempt.maxScore,
			percentage: attempt.percentage,
			passed: attempt.passed,
			submittedAt: attempt.submittedAt,
		}));

		const avgQuizScore =
			quizAttempts.length > 0
				? quizAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) /
					quizAttempts.length
				: 0;

		// Assignment performance
		const assignmentPerformance = submissions
			.filter((s) => s.status === "GRADED")
			.map((submission) => ({
				assignmentId: submission.assignmentId,
				assignmentTitle: submission.assignment.title,
				score: submission.score,
				maxScore: submission.maxScore,
				submittedAt: submission.submittedAt,
				isLate: submission.isLate,
			}));

		const avgAssignmentScore =
			assignmentPerformance.length > 0
				? assignmentPerformance.reduce(
						(sum, a) => sum + ((a.score || 0) / (a.maxScore || 1)) * 100,
						0,
					) / assignmentPerformance.length
				: 0;

		return {
			courseProgress,
			quizPerformance,
			assignmentPerformance,
			summary: {
				totalCourses: enrollments.length,
				completedCourses: enrollments.filter((e) => e.status === "COMPLETED")
					.length,
				avgCourseProgress:
					courseProgress.reduce((sum, c) => sum + c.progress, 0) /
					(courseProgress.length || 1),
				avgQuizScore,
				avgAssignmentScore,
				totalQuizzesTaken: quizAttempts.length,
				totalAssignmentsSubmitted: submissions.length,
			},
		};
	}

	// ========== Course Analytics (For Instructors) ==========

	async getCourseAnalytics(courseId: string, instructorId: string) {
		// Verify instructor owns the course
		const course = await this.prisma.course.findFirst({
			where: { id: courseId, instructorId },
		});

		if (!course) {
			throw new Error("Course not found or access denied");
		}

		const [enrollments, quizzes, assignments, discussions] = await Promise.all([
			this.prisma.enrollment.findMany({
				where: { courseId },
				include: {
					student: { select: { id: true, name: true, email: true } },
					lessonProgress: true,
					quizAttempts: {
						include: { quiz: { select: { id: true, title: true } } },
					},
					submissions: {
						include: { assignment: { select: { id: true, title: true } } },
					},
				},
			}),
			this.prisma.onlineQuiz.findMany({
				where: { lesson: { module: { courseId } } },
				include: { attempts: true },
			}),
			this.prisma.assignment.findMany({
				where: { lesson: { module: { courseId } } },
				include: { submissions: true },
			}),
			this.prisma.discussionThread.findMany({
				where: { courseId },
				include: { posts: true },
			}),
		]);

		// Enrollment stats
		const enrollmentStats = {
			total: enrollments.length,
			active: enrollments.filter((e) => e.status === "ACTIVE").length,
			completed: enrollments.filter((e) => e.status === "COMPLETED").length,
			dropped: enrollments.filter((e) => e.status === "DROPPED").length,
		};

		// Progress distribution
		const progressBuckets = [0, 25, 50, 75, 100];
		const progressDistribution = progressBuckets
			.slice(0, -1)
			.map((min, idx) => {
				const max = progressBuckets[idx + 1];
				const count = enrollments.filter(
					(e) => e.progress >= min && e.progress < max,
				).length;
				return { range: `${min}-${max}%`, count };
			});

		// Quiz analytics
		const quizAnalytics = quizzes.map((quiz) => {
			const attempts = quiz.attempts.filter((a) => a.status === "GRADED");
			const avgScore =
				attempts.length > 0
					? attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) /
						attempts.length
					: 0;
			const passRate =
				attempts.length > 0
					? (attempts.filter((a) => a.passed).length / attempts.length) * 100
					: 0;

			return {
				quizId: quiz.id,
				title: quiz.title,
				totalAttempts: attempts.length,
				avgScore,
				passRate,
			};
		});

		// Assignment analytics
		const assignmentAnalytics = assignments.map((assignment) => {
			const graded = assignment.submissions.filter(
				(s) => s.status === "GRADED",
			);
			const avgScore =
				graded.length > 0
					? graded.reduce(
							(sum, s) =>
								sum +
								((s.score || 0) / (s.maxScore || assignment.totalMarks)) * 100,
							0,
						) / graded.length
					: 0;
			const lateSubmissions = assignment.submissions.filter(
				(s) => s.isLate,
			).length;

			return {
				assignmentId: assignment.id,
				title: assignment.title,
				totalSubmissions: assignment.submissions.length,
				gradedSubmissions: graded.length,
				avgScore,
				lateSubmissions,
			};
		});

		// Discussion engagement
		const discussionStats = {
			totalThreads: discussions.length,
			totalPosts: discussions.reduce((sum, d) => sum + d.posts.length, 0),
			avgPostsPerThread:
				discussions.length > 0
					? discussions.reduce((sum, d) => sum + d.posts.length, 0) /
						discussions.length
					: 0,
		};

		// Student leaderboard
		const studentPerformance = enrollments.map((e) => {
			const quizScores = e.quizAttempts.filter((a) => a.status === "GRADED");
			const avgQuiz =
				quizScores.length > 0
					? quizScores.reduce((sum, a) => sum + (a.percentage || 0), 0) /
						quizScores.length
					: 0;

			const gradedSubs = e.submissions.filter((s) => s.status === "GRADED");
			const avgAssignment =
				gradedSubs.length > 0
					? gradedSubs.reduce(
							(sum, s) => sum + ((s.score || 0) / (s.maxScore || 1)) * 100,
							0,
						) / gradedSubs.length
					: 0;

			return {
				studentId: e.studentId,
				studentName: e.student.name,
				progress: e.progress,
				avgQuizScore: avgQuiz,
				avgAssignmentScore: avgAssignment,
				overallScore: (avgQuiz + avgAssignment) / 2,
			};
		});

		studentPerformance.sort((a, b) => b.overallScore - a.overallScore);

		return {
			courseId,
			courseTitle: course.title,
			enrollmentStats,
			progressDistribution,
			quizAnalytics,
			assignmentAnalytics,
			discussionStats,
			topPerformers: studentPerformance.slice(0, 10),
			strugglingStudents: studentPerformance
				.filter((s) => s.overallScore < 50)
				.slice(0, 10),
		};
	}

	// ========== Platform-wide Analytics (Admin) ==========

	async getPlatformAnalytics() {
		const [
			userStats,
			courseStats,
			enrollmentStats,
			recentUsers,
			recentEnrollments,
		] = await Promise.all([
			// User statistics by role
			this.prisma.user.groupBy({
				by: ["role"],
				_count: { id: true },
			}),
			// Course statistics
			this.prisma.course.groupBy({
				by: ["status"],
				_count: { id: true },
			}),
			// Enrollment trends (last 30 days)
			this.prisma.enrollment.count({
				where: {
					enrolledAt: {
						gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
					},
				},
			}),
			// Recently registered users
			this.prisma.user.findMany({
				orderBy: { createdAt: "desc" },
				take: 10,
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					createdAt: true,
				},
			}),
			// Recent enrollments
			this.prisma.enrollment.findMany({
				orderBy: { enrolledAt: "desc" },
				take: 10,
				include: {
					student: { select: { name: true } },
					course: { select: { title: true } },
				},
			}),
		]);

		const totalUsers = userStats.reduce((sum, u) => sum + u._count.id, 0);
		const totalCourses = courseStats.reduce((sum, c) => sum + c._count.id, 0);

		return {
			users: {
				total: totalUsers,
				byRole: userStats.map((u) => ({ role: u.role, count: u._count.id })),
			},
			courses: {
				total: totalCourses,
				byStatus: courseStats.map((c) => ({
					status: c.status,
					count: c._count.id,
				})),
			},
			enrollments: {
				last30Days: enrollmentStats,
			},
			recentUsers,
			recentEnrollments: recentEnrollments.map((e) => ({
				studentName: e.student.name,
				courseTitle: e.course.title,
				enrolledAt: e.enrolledAt,
			})),
		};
	}

	// ========== Activity Logging ==========

	async logActivity(
		userId: string,
		type: string,
		entityType: string,
		entityId: string,
		title: string,
		description?: string,
		metadata?: any,
	) {
		return this.prisma.activityLog.create({
			data: {
				userId,
				action: type,
				entityType,
				entityId,
				metadata: JSON.stringify({ title, description, ...metadata }),
			},
		});
	}

	async getRecentActivity(userId: string, limit: number = 10) {
		return this.prisma.activityLog.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			take: limit,
		});
	}
}
