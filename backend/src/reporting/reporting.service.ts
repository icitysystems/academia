import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

export interface ClassSummary {
	templateId: string;
	templateName: string;
	totalStudents: number;
	averageScore: number;
	highestScore: number;
	lowestScore: number;
	passRate: number;
	gradeDistribution: Record<string, number>;
}

export interface TemplateQuestionAnalysis {
	regionId: string;
	label: string;
	questionType: string;
	totalAttempts: number;
	correctCount: number;
	partialCount: number;
	incorrectCount: number;
	averageScore: number;
	difficultyIndex: number;
}

export interface StudentReport {
	studentId: string;
	studentName: string;
	sheets: Array<{
		sheetId: string;
		templateName: string;
		totalScore: number;
		maxScore: number;
		percentage: number;
		grade: string;
		gradedAt: Date;
	}>;
	overallAverage: number;
}

@Injectable()
export class ReportingService {
	constructor(private prisma: PrismaService) {}

	/**
	 * Get class summary for a template
	 */
	async getClassSummary(
		templateId: string,
		teacherId: string,
	): Promise<ClassSummary> {
		const template = await this.prisma.template.findUnique({
			where: { id: templateId },
		});

		if (!template || template.createdById !== teacherId) {
			throw new Error("Template not found");
		}

		const pdfOutputs = await this.prisma.pDFOutput.findMany({
			where: {
				sheet: { templateId },
			},
			include: {
				sheet: true,
			},
		});

		if (pdfOutputs.length === 0) {
			return {
				templateId,
				templateName: template.name,
				totalStudents: 0,
				averageScore: 0,
				highestScore: 0,
				lowestScore: 0,
				passRate: 0,
				gradeDistribution: {},
			};
		}

		const percentages = pdfOutputs.map((p) =>
			p.maxScore > 0 ? (p.totalScore / p.maxScore) * 100 : 0,
		);

		const gradeDistribution: Record<string, number> = {
			A: 0,
			B: 0,
			C: 0,
			D: 0,
			F: 0,
		};

		for (const pct of percentages) {
			if (pct >= 90) gradeDistribution.A++;
			else if (pct >= 80) gradeDistribution.B++;
			else if (pct >= 70) gradeDistribution.C++;
			else if (pct >= 60) gradeDistribution.D++;
			else gradeDistribution.F++;
		}

		return {
			templateId,
			templateName: template.name,
			totalStudents: pdfOutputs.length,
			averageScore: percentages.reduce((a, b) => a + b, 0) / percentages.length,
			highestScore: Math.max(...percentages),
			lowestScore: Math.min(...percentages),
			passRate:
				(percentages.filter((p) => p >= 60).length / percentages.length) * 100,
			gradeDistribution,
		};
	}

	/**
	 * Get question-level analysis
	 */
	async getQuestionAnalysis(
		templateId: string,
		teacherId: string,
	): Promise<TemplateQuestionAnalysis[]> {
		const template = await this.prisma.template.findUnique({
			where: { id: templateId },
			include: { regions: true },
		});

		if (!template || template.createdById !== teacherId) {
			throw new Error("Template not found");
		}

		const analysis: TemplateQuestionAnalysis[] = [];

		for (const region of template.regions) {
			const results = await this.prisma.gradingResult.findMany({
				where: {
					regionId: region.id,
					job: { templateId },
				},
			});

			if (results.length === 0) {
				analysis.push({
					regionId: region.id,
					label: region.label,
					questionType: region.questionType,
					totalAttempts: 0,
					correctCount: 0,
					partialCount: 0,
					incorrectCount: 0,
					averageScore: 0,
					difficultyIndex: 0,
				});
				continue;
			}

			const correctCount = results.filter(
				(r) => r.predictedCorrectness === "CORRECT",
			).length;
			const partialCount = results.filter(
				(r) => r.predictedCorrectness === "PARTIAL",
			).length;
			const incorrectCount = results.filter(
				(r) =>
					r.predictedCorrectness === "INCORRECT" ||
					r.predictedCorrectness === "SKIPPED",
			).length;

			const totalScore = results.reduce((sum, r) => sum + r.assignedScore, 0);
			const maxPossible = results.length * region.points;

			analysis.push({
				regionId: region.id,
				label: region.label,
				questionType: region.questionType,
				totalAttempts: results.length,
				correctCount,
				partialCount,
				incorrectCount,
				averageScore: totalScore / results.length,
				difficultyIndex: maxPossible > 0 ? 1 - totalScore / maxPossible : 0,
			});
		}

		return analysis.sort((a, b) => b.difficultyIndex - a.difficultyIndex);
	}

	/**
	 * Get student report
	 */
	async getStudentReport(
		studentId: string,
		teacherId: string,
	): Promise<StudentReport> {
		const sheets = await this.prisma.answerSheet.findMany({
			where: {
				studentId,
				template: { createdById: teacherId },
			},
			include: {
				template: true,
				pdfOutput: true,
			},
		});

		const sheetReports = sheets
			.filter((s) => s.pdfOutput)
			.map((s) => ({
				sheetId: s.id,
				templateName: s.template.name,
				totalScore: s.pdfOutput!.totalScore,
				maxScore: s.pdfOutput!.maxScore,
				percentage:
					s.pdfOutput!.maxScore > 0
						? (s.pdfOutput!.totalScore / s.pdfOutput!.maxScore) * 100
						: 0,
				grade: this.calculateGrade(
					s.pdfOutput!.totalScore,
					s.pdfOutput!.maxScore,
				),
				gradedAt: s.pdfOutput!.createdAt,
			}));

		const overallAverage =
			sheetReports.length > 0
				? sheetReports.reduce((sum, s) => sum + s.percentage, 0) /
					sheetReports.length
				: 0;

		return {
			studentId,
			studentName: sheets[0]?.studentName || studentId,
			sheets: sheetReports,
			overallAverage,
		};
	}

	/**
	 * Export data as CSV
	 */
	async exportResultsCSV(
		templateId: string,
		teacherId: string,
	): Promise<string> {
		const pdfOutputs = await this.prisma.pDFOutput.findMany({
			where: {
				sheet: {
					templateId,
					template: { createdById: teacherId },
				},
			},
			include: {
				sheet: {
					include: {
						gradingResults: {
							include: { region: true },
						},
					},
				},
			},
		});

		// Build CSV header
		const regions = await this.prisma.templateRegion.findMany({
			where: { templateId },
			orderBy: { orderIndex: "asc" },
		});

		const headers = [
			"Student ID",
			"Student Name",
			...regions.map((r) => r.label),
			"Total Score",
			"Max Score",
			"Percentage",
			"Grade",
		];

		const rows = pdfOutputs.map((output) => {
			const sheet = output.sheet;
			const resultsByRegion: Record<string, number> = {};

			for (const result of sheet.gradingResults) {
				resultsByRegion[result.regionId] = result.assignedScore;
			}

			const percentage =
				output.maxScore > 0
					? ((output.totalScore / output.maxScore) * 100).toFixed(1)
					: "0";

			return [
				sheet.studentId || "",
				sheet.studentName || "",
				...regions.map((r) => resultsByRegion[r.id]?.toString() || "0"),
				output.totalScore.toString(),
				output.maxScore.toString(),
				percentage,
				this.calculateGrade(output.totalScore, output.maxScore),
			];
		});

		// Build CSV string
		const csv = [
			headers.join(","),
			...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
		].join("\n");

		return csv;
	}

	/**
	 * Export exam grading results as CSV
	 * As per Specification 5A.6: "Export CSV/XLSX"
	 */
	async exportExamResultsCSV(
		examPaperId: string,
		teacherId: string,
	): Promise<string> {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
			include: {
				questions: { orderBy: { orderIndex: "asc" } },
			},
		});

		if (!paper) {
			throw new Error("Exam paper not found");
		}

		const submissions = await this.prisma.studentExamSubmission.findMany({
			where: {
				examPaperId,
				status: { in: ["GRADED", "REVIEWED"] },
			},
			include: {
				responses: {
					include: { question: true },
				},
			},
			orderBy: { studentName: "asc" },
		});

		// Build CSV header
		const headers = [
			"Student ID",
			"Student Name",
			...paper.questions.map((q) => `Q${q.questionNumber} (${q.marks} pts)`),
			"Total Score",
			"Percentage",
			"Grade",
			"AI Confidence (Avg)",
			"Needs Review",
		];

		const rows = submissions.map((submission) => {
			const responsesByQuestion: Record<string, any> = {};
			for (const response of submission.responses) {
				responsesByQuestion[response.questionId] = response;
			}

			const avgConfidence =
				submission.responses.length > 0
					? submission.responses.reduce(
							(sum, r) => sum + (r.confidence || 0),
							0,
						) / submission.responses.length
					: 0;

			const needsReview = submission.responses.some((r) => r.needsReview);

			return [
				submission.studentId || "",
				submission.studentName || "",
				...paper.questions.map((q) => {
					const response = responsesByQuestion[q.id];
					return response ? response.assignedScore?.toFixed(1) || "0" : "-";
				}),
				submission.totalScore?.toFixed(1) || "0",
				submission.percentage?.toFixed(1) || "0",
				submission.grade || "",
				(avgConfidence * 100).toFixed(0) + "%",
				needsReview ? "Yes" : "No",
			];
		});

		// Build CSV string
		const csv = [
			`Exam: ${paper.title}`,
			`Subject: ${paper.subject}`,
			`Total Marks: ${paper.totalMarks}`,
			`Generated: ${new Date().toISOString()}`,
			"",
			headers.join(","),
			...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
		].join("\n");

		return csv;
	}

	/**
	 * Export class summary as CSV
	 * As per Specification 5A.6: "Per-class summaries"
	 */
	async exportClassSummaryCSV(
		examPaperId: string,
		teacherId: string,
	): Promise<string> {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
		});

		if (!paper) {
			throw new Error("Exam paper not found");
		}

		const submissions = await this.prisma.studentExamSubmission.findMany({
			where: { examPaperId, status: { in: ["GRADED", "REVIEWED"] } },
		});

		const scores = submissions
			.map((s) => s.percentage || 0)
			.filter((p) => p !== null);

		const gradeDistribution = submissions.reduce(
			(acc, s) => {
				const grade = s.grade || "Ungraded";
				acc[grade] = (acc[grade] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const avgScore =
			scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

		const stdDev = this.calculateStandardDeviation(scores);
		const passCount = scores.filter((s) => s >= 50).length;
		const passRate = scores.length > 0 ? (passCount / scores.length) * 100 : 0;

		// Build summary CSV
		const lines = [
			`Class Summary Report`,
			`Exam: ${paper.title}`,
			`Subject: ${paper.subject}`,
			`Generated: ${new Date().toISOString()}`,
			"",
			"STATISTICS",
			`Total Students,${submissions.length}`,
			`Average Score,${avgScore.toFixed(1)}%`,
			`Highest Score,${scores.length > 0 ? Math.max(...scores).toFixed(1) : 0}%`,
			`Lowest Score,${scores.length > 0 ? Math.min(...scores).toFixed(1) : 0}%`,
			`Standard Deviation,${stdDev?.toFixed(2) || "N/A"}`,
			`Pass Rate (>=50%),${passRate.toFixed(1)}%`,
			"",
			"GRADE DISTRIBUTION",
			...Object.entries(gradeDistribution).map(
				([grade, count]) =>
					`Grade ${grade},${count},${((count / submissions.length) * 100).toFixed(1)}%`,
			),
		];

		return lines.join("\n");
	}

	/**
	 * Export question-level analysis
	 * As per Specification 5A.6: "Question-level difficulty analysis"
	 */
	async exportQuestionAnalysisCSV(
		examPaperId: string,
		teacherId: string,
	): Promise<string> {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
			include: {
				questions: { orderBy: { orderIndex: "asc" } },
			},
		});

		if (!paper) {
			throw new Error("Exam paper not found");
		}

		const headers = [
			"Question #",
			"Type",
			"Max Marks",
			"Avg Score",
			"Avg %",
			"Correct",
			"Partial",
			"Incorrect",
			"Difficulty",
		];

		const rows = await Promise.all(
			paper.questions.map(async (question) => {
				const responses = await this.prisma.studentResponse.findMany({
					where: {
						questionId: question.id,
						submission: { examPaperId },
					},
				});

				const scores = responses.map((r) => r.assignedScore || 0);
				const avgScore =
					scores.length > 0
						? scores.reduce((a, b) => a + b, 0) / scores.length
						: 0;
				const avgPercentage =
					question.marks > 0 ? (avgScore / question.marks) * 100 : 0;

				let difficulty: string;
				if (avgPercentage >= 80) difficulty = "EASY";
				else if (avgPercentage >= 60) difficulty = "MODERATE";
				else if (avgPercentage >= 40) difficulty = "CHALLENGING";
				else difficulty = "DIFFICULT";

				const correct = responses.filter(
					(r) => r.predictedCorrectness === "CORRECT",
				).length;
				const partial = responses.filter(
					(r) => r.predictedCorrectness === "PARTIAL",
				).length;
				const incorrect = responses.filter(
					(r) => r.predictedCorrectness === "INCORRECT",
				).length;

				return [
					question.questionNumber.toString(),
					question.questionType,
					question.marks.toString(),
					avgScore.toFixed(2),
					avgPercentage.toFixed(1) + "%",
					correct.toString(),
					partial.toString(),
					incorrect.toString(),
					difficulty,
				];
			}),
		);

		const csv = [
			`Question Analysis Report`,
			`Exam: ${paper.title}`,
			`Subject: ${paper.subject}`,
			`Generated: ${new Date().toISOString()}`,
			"",
			headers.join(","),
			...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
		].join("\n");

		return csv;
	}

	/**
	 * Export individual student score sheet
	 * As per Specification 5A.6: "Per-student score sheets"
	 */
	async exportStudentScoreSheet(
		submissionId: string,
		teacherId: string,
	): Promise<string> {
		const submission = await this.prisma.studentExamSubmission.findFirst({
			where: { id: submissionId },
			include: {
				examPaper: {
					include: {
						questions: { orderBy: { orderIndex: "asc" } },
					},
				},
				responses: {
					include: { question: true },
				},
			},
		});

		if (!submission || submission.examPaper.teacherId !== teacherId) {
			throw new Error("Submission not found");
		}

		const responsesByQuestion: Record<string, any> = {};
		for (const response of submission.responses) {
			responsesByQuestion[response.questionId] = response;
		}

		const lines = [
			`STUDENT SCORE SHEET`,
			``,
			`Student Name: ${submission.studentName || "N/A"}`,
			`Student ID: ${submission.studentId || "N/A"}`,
			`Exam: ${submission.examPaper.title}`,
			`Subject: ${submission.examPaper.subject}`,
			`Date Graded: ${submission.gradedAt?.toISOString() || "Not graded"}`,
			``,
			`RESULTS`,
			`Question,Type,Max Marks,Score,AI Confidence,Feedback`,
			...submission.examPaper.questions.map((q) => {
				const response = responsesByQuestion[q.id];
				return [
					`Q${q.questionNumber}`,
					q.questionType,
					q.marks,
					response?.assignedScore?.toFixed(1) || "-",
					response?.confidence
						? (response.confidence * 100).toFixed(0) + "%"
						: "-",
					response?.explanation || "",
				]
					.map((cell) => `"${cell}"`)
					.join(",");
			}),
			``,
			`TOTAL SCORE: ${submission.totalScore?.toFixed(1) || 0} / ${submission.examPaper.totalMarks}`,
			`PERCENTAGE: ${submission.percentage?.toFixed(1) || 0}%`,
			`GRADE: ${submission.grade || "N/A"}`,
			``,
			`Overall Feedback: ${submission.feedback || "No feedback provided"}`,
		];

		return lines.join("\n");
	}

	private calculateStandardDeviation(scores: number[]): number | null {
		if (scores.length < 2) return null;
		const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
		const squaredDiffs = scores.map((s) => Math.pow(s - mean, 2));
		const avgSquaredDiff =
			squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
		return Math.sqrt(avgSquaredDiff);
	}

	/**
	 * Get score distribution data for charts
	 */
	async getScoreDistribution(templateId: string, teacherId: string) {
		const pdfOutputs = await this.prisma.pDFOutput.findMany({
			where: {
				sheet: {
					templateId,
					template: { createdById: teacherId },
				},
			},
		});

		// Create histogram buckets (0-10, 10-20, ..., 90-100)
		const buckets: number[] = new Array(10).fill(0);

		for (const output of pdfOutputs) {
			const percentage =
				output.maxScore > 0 ? (output.totalScore / output.maxScore) * 100 : 0;
			const bucketIndex = Math.min(Math.floor(percentage / 10), 9);
			buckets[bucketIndex]++;
		}

		return buckets.map((count, index) => ({
			range: `${index * 10}-${(index + 1) * 10}%`,
			count,
		}));
	}

	/**
	 * Get exam score distribution for charts
	 * As per Specification 5A.6: "Distribution charts"
	 */
	async getExamScoreDistribution(examPaperId: string, teacherId: string) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
		});

		if (!paper) {
			throw new Error("Exam paper not found");
		}

		const submissions = await this.prisma.studentExamSubmission.findMany({
			where: { examPaperId, status: { in: ["GRADED", "REVIEWED"] } },
		});

		// Create histogram buckets (0-10, 10-20, ..., 90-100)
		const buckets: number[] = new Array(10).fill(0);

		for (const submission of submissions) {
			const percentage = submission.percentage || 0;
			const bucketIndex = Math.min(Math.floor(percentage / 10), 9);
			buckets[bucketIndex]++;
		}

		return {
			examPaperId,
			examTitle: paper.title,
			distribution: buckets.map((count, index) => ({
				range: `${index * 10}-${(index + 1) * 10}%`,
				count,
				percentage:
					submissions.length > 0
						? ((count / submissions.length) * 100).toFixed(1)
						: "0",
			})),
			totalSubmissions: submissions.length,
		};
	}

	private calculateGrade(score: number, maxScore: number): string {
		if (maxScore === 0) return "N/A";
		const percentage = (score / maxScore) * 100;

		if (percentage >= 90) return "A";
		if (percentage >= 80) return "B";
		if (percentage >= 70) return "C";
		if (percentage >= 60) return "D";
		return "F";
	}

	// ========================
	// ENROLLMENT & ACADEMIC REPORTING (Spec 3A)
	// ========================

	/**
	 * Get enrollment statistics
	 * As per Spec 3A.1: Admin dashboard enrollment monitoring
	 */
	async getEnrollmentStats(filters?: {
		startDate?: Date;
		endDate?: Date;
		departmentId?: string;
	}) {
		const start =
			filters?.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
		const end = filters?.endDate || new Date();

		const [
			totalStudents,
			activeEnrollments,
			newEnrollmentsThisPeriod,
			enrollmentsByStatus,
			enrollmentsByCourse,
		] = await Promise.all([
			this.prisma.user.count({ where: { role: "STUDENT" } }),
			this.prisma.enrollment.count({ where: { status: "ACTIVE" } }),
			this.prisma.enrollment.count({
				where: { enrolledAt: { gte: start, lte: end } },
			}),
			this.prisma.enrollment.groupBy({
				by: ["status"],
				_count: { id: true },
			}),
			this.prisma.enrollment.groupBy({
				by: ["courseId"],
				_count: { id: true },
				where: { status: "ACTIVE" },
				orderBy: { _count: { id: "desc" } },
				take: 10,
			}),
		]);

		// Get course details for top enrollments
		const courseIds = enrollmentsByCourse.map((e) => e.courseId);
		const courses = await this.prisma.course.findMany({
			where: { id: { in: courseIds } },
			select: { id: true, title: true },
		});
		const courseMap = new Map(courses.map((c) => [c.id, c.title]));

		// Calculate trends
		const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

		const [thisMonthEnrollments, lastMonthEnrollments] = await Promise.all([
			this.prisma.enrollment.count({
				where: { enrolledAt: { gte: lastMonth } },
			}),
			this.prisma.enrollment.count({
				where: { enrolledAt: { gte: twoMonthsAgo, lt: lastMonth } },
			}),
		]);

		const growthRate =
			lastMonthEnrollments > 0
				? ((thisMonthEnrollments - lastMonthEnrollments) /
						lastMonthEnrollments) *
					100
				: 0;

		return {
			summary: {
				totalStudents,
				activeEnrollments,
				newEnrollmentsThisPeriod,
				averageEnrollmentsPerCourse: activeEnrollments / (courses.length || 1),
			},
			byStatus: enrollmentsByStatus.map((e) => ({
				status: e.status,
				count: e._count.id,
			})),
			topCourses: enrollmentsByCourse.map((e) => ({
				courseId: e.courseId,
				courseTitle: courseMap.get(e.courseId) || "Unknown",
				enrollmentCount: e._count.id,
			})),
			trends: {
				thisMonth: thisMonthEnrollments,
				lastMonth: lastMonthEnrollments,
				growthRate: growthRate.toFixed(1),
			},
			period: { start, end },
		};
	}

	/**
	 * Get academic performance trends
	 */
	async getAcademicPerformanceTrends(filters?: {
		courseId?: string;
		startDate?: Date;
		endDate?: Date;
	}) {
		const start =
			filters?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
		const end = filters?.endDate || new Date();

		// Get quiz performance trends
		const quizAttempts = await this.prisma.quizAttempt.findMany({
			where: {
				startedAt: { gte: start, lte: end },
				submittedAt: { not: null },
			},
			include: {
				quiz: { select: { title: true } },
			},
			orderBy: { submittedAt: "asc" },
		});

		// Calculate weekly averages
		const weeklyData = new Map<string, { total: number; count: number }>();
		for (const attempt of quizAttempts) {
			if (attempt.submittedAt) {
				const week = this.getWeekKey(attempt.submittedAt);
				const current = weeklyData.get(week) || { total: 0, count: 0 };
				current.total += attempt.percentage || 0;
				current.count++;
				weeklyData.set(week, current);
			}
		}

		const weeklyAverages = Array.from(weeklyData.entries()).map(
			([week, data]) => ({
				week,
				averageScore: data.count > 0 ? data.total / data.count : 0,
				attemptCount: data.count,
			}),
		);

		// Get assignment performance
		const assignments = await this.prisma.assignmentSubmission.findMany({
			where: {
				submittedAt: { gte: start, lte: end },
				score: { not: null },
			},
		});

		const avgAssignmentGrade =
			assignments.length > 0
				? assignments.reduce((sum, a) => sum + (a.score || 0), 0) /
					assignments.length
				: 0;

		// Get exam performance from StudentExamSubmission
		const examResults = await this.prisma.studentExamSubmission.findMany({
			where: {
				createdAt: { gte: start, lte: end },
				status: { in: ["GRADED", "REVIEWED"] },
			},
		});

		const avgExamScore =
			examResults.length > 0
				? examResults.reduce((sum, e) => sum + (e.percentage || 0), 0) /
					examResults.length
				: 0;

		return {
			period: { start, end },
			quizPerformance: {
				totalAttempts: quizAttempts.length,
				averageScore:
					quizAttempts.length > 0
						? quizAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) /
							quizAttempts.length
						: 0,
				weeklyTrend: weeklyAverages,
			},
			assignmentPerformance: {
				totalSubmissions: assignments.length,
				averageGrade: avgAssignmentGrade,
			},
			examPerformance: {
				totalExams: examResults.length,
				averageScore: avgExamScore,
			},
		};
	}

	/**
	 * Get at-risk students report
	 * As per Spec 3A.1: Monitor student performance and identify at-risk students
	 */
	async getAtRiskStudents(thresholds?: {
		minGradePercent?: number;
		minAttendancePercent?: number;
		inactiveDays?: number;
	}) {
		const minGrade = thresholds?.minGradePercent || 60;
		const inactiveDays = thresholds?.inactiveDays || 14;
		const inactiveThreshold = new Date(
			Date.now() - inactiveDays * 24 * 60 * 60 * 1000,
		);

		// Get all active students with enrollments
		const students = await this.prisma.user.findMany({
			where: { role: "STUDENT", isActive: true },
			include: {
				enrollments: {
					where: { status: "ACTIVE" },
					include: { course: { select: { id: true, title: true } } },
				},
			},
		});

		const atRiskStudents = [];

		for (const student of students) {
			const riskFactors: string[] = [];
			let riskScore = 0;

			// Get quiz attempts for this student
			const quizAttempts = await this.prisma.quizAttempt.findMany({
				where: { studentId: student.id, submittedAt: { not: null } },
				orderBy: { submittedAt: "desc" },
				take: 10,
			});

			// Get assignment submissions for this student
			const assignmentSubmissions =
				await this.prisma.assignmentSubmission.findMany({
					where: { studentId: student.id },
					orderBy: { submittedAt: "desc" },
					take: 10,
				});

			// Get lesson progress through enrollments
			const enrollmentIds = student.enrollments.map((e) => e.id);
			const lessonProgress = await this.prisma.lessonProgress.findMany({
				where: { enrollmentId: { in: enrollmentIds } },
				orderBy: { updatedAt: "desc" },
				take: 1,
			});

			// Check academic performance
			if (quizAttempts.length > 0) {
				const avgQuizScore =
					quizAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) /
					quizAttempts.length;

				if (avgQuizScore < minGrade) {
					riskFactors.push(`Low quiz average: ${avgQuizScore.toFixed(1)}%`);
					riskScore += 3;
				}
			}

			// Check assignment submissions
			if (assignmentSubmissions.length > 0) {
				const scoredSubmissions = assignmentSubmissions.filter(
					(a) => a.score !== null,
				);
				const avgScore =
					scoredSubmissions.length > 0
						? scoredSubmissions.reduce((sum, a) => sum + (a.score || 0), 0) /
							scoredSubmissions.length
						: 0;

				if (avgScore < minGrade) {
					riskFactors.push(`Low assignment scores: ${avgScore.toFixed(1)}%`);
					riskScore += 3;
				}

				// Check for late submissions
				const lateCount = assignmentSubmissions.filter((a) => a.isLate).length;
				if (lateCount > 2) {
					riskFactors.push(`Multiple late submissions: ${lateCount}`);
					riskScore += 1;
				}
			}

			// Check activity/engagement
			const lastActivity =
				lessonProgress[0]?.updatedAt ||
				quizAttempts[0]?.submittedAt ||
				assignmentSubmissions[0]?.submittedAt;

			if (!lastActivity || lastActivity < inactiveThreshold) {
				riskFactors.push(`Inactive for ${inactiveDays}+ days`);
				riskScore += 4;
			}

			// Check enrollment without progress
			if (student.enrollments.length > 0 && lessonProgress.length === 0) {
				riskFactors.push("Enrolled but no lesson progress");
				riskScore += 2;
			}

			// Only include if at risk
			if (riskScore >= 3) {
				atRiskStudents.push({
					studentId: student.id,
					studentName: student.name,
					email: student.email,
					enrolledCourses: student.enrollments.map((e) => e.course.title),
					riskFactors,
					riskScore,
					riskLevel:
						riskScore >= 7 ? "HIGH" : riskScore >= 5 ? "MEDIUM" : "LOW",
					lastActivity,
					recommendedActions: this.getRecommendedActions(riskFactors),
				});
			}
		}

		// Sort by risk score descending
		atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);

		return {
			totalAtRisk: atRiskStudents.length,
			highRisk: atRiskStudents.filter((s) => s.riskLevel === "HIGH").length,
			mediumRisk: atRiskStudents.filter((s) => s.riskLevel === "MEDIUM").length,
			lowRisk: atRiskStudents.filter((s) => s.riskLevel === "LOW").length,
			students: atRiskStudents,
			thresholds: {
				minGradePercent: minGrade,
				inactiveDays,
			},
		};
	}

	/**
	 * Get recommended actions for at-risk students
	 */
	private getRecommendedActions(riskFactors: string[]): string[] {
		const actions: string[] = [];

		for (const factor of riskFactors) {
			if (factor.includes("Low quiz")) {
				actions.push("Schedule tutoring session");
				actions.push("Assign additional practice quizzes");
			}
			if (factor.includes("Low assignment")) {
				actions.push("Review assignment requirements with student");
				actions.push("Consider offering extra credit opportunity");
			}
			if (factor.includes("Inactive")) {
				actions.push("Send engagement reminder email");
				actions.push("Schedule check-in meeting");
			}
			if (factor.includes("late submissions")) {
				actions.push("Discuss time management strategies");
			}
			if (factor.includes("no lesson progress")) {
				actions.push("Send course orientation guide");
				actions.push("Offer one-on-one onboarding session");
			}
		}

		return [...new Set(actions)]; // Remove duplicates
	}

	// ========================
	// FINANCIAL REPORTING (Spec 3A.3)
	// ========================

	/**
	 * Get financial reports
	 * As per Spec 3A.3: "Financial reports"
	 */
	async getFinancialReports(filters?: {
		startDate?: Date;
		endDate?: Date;
		reportType?: string;
	}) {
		const start =
			filters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const end = filters?.endDate || new Date();

		// Get payment data
		const payments = await this.prisma.payment.findMany({
			where: { createdAt: { gte: start, lte: end } },
		});

		// Aggregate by type
		const byType = payments.reduce(
			(acc, p) => {
				const key = p.type || "OTHER";
				if (!acc[key]) acc[key] = { total: 0, count: 0, completed: 0 };
				acc[key].total += p.amount;
				acc[key].count++;
				if (p.status === "COMPLETED") acc[key].completed += p.amount;
				return acc;
			},
			{} as Record<string, { total: number; count: number; completed: number }>,
		);

		// Daily revenue breakdown
		const dailyRevenue = new Map<string, number>();
		for (const payment of payments.filter((p) => p.status === "COMPLETED")) {
			const day =
				payment.paidAt?.toISOString().split("T")[0] ||
				payment.createdAt.toISOString().split("T")[0];
			dailyRevenue.set(day, (dailyRevenue.get(day) || 0) + payment.amount);
		}

		// Get subscription revenue
		const subscriptions = await this.prisma.subscription.findMany({
			where: {
				status: "ACTIVE",
				createdAt: { lte: end },
			},
		});

		const subscriptionMRR = subscriptions.reduce(
			(sum, s) => sum + (s.priceAtSubscription || 0),
			0,
		);

		// Get donation data
		const donations = await this.prisma.donation.findMany({
			where: {
				createdAt: { gte: start, lte: end },
				status: "COMPLETED",
			},
		});

		const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);

		// Outstanding balances
		const outstandingPayments = await this.prisma.payment.aggregate({
			_sum: { amount: true },
			where: { status: "PENDING" },
		});

		return {
			period: { start, end },
			revenue: {
				totalCollected: payments
					.filter((p) => p.status === "COMPLETED")
					.reduce((sum, p) => sum + p.amount, 0),
				totalPending: payments
					.filter((p) => p.status === "PENDING")
					.reduce((sum, p) => sum + p.amount, 0),
				byType: Object.entries(byType).map(([type, data]) => ({
					type,
					totalAmount: data.total,
					collectedAmount: data.completed,
					transactionCount: data.count,
				})),
				dailyBreakdown: Array.from(dailyRevenue.entries())
					.map(([date, amount]) => ({ date, amount }))
					.sort((a, b) => a.date.localeCompare(b.date)),
			},
			subscriptions: {
				activeCount: subscriptions.length,
				monthlyRecurringRevenue: subscriptionMRR,
			},
			donations: {
				totalAmount: totalDonations,
				count: donations.length,
			},
			outstandingBalance: outstandingPayments._sum.amount || 0,
		};
	}

	/**
	 * Get common mistakes analysis for teaching insights
	 * As per Spec 3A.1: Monitor class performance
	 */
	async getCommonMistakesAnalysis(filters?: {
		courseId?: string;
		quizId?: string;
		examPaperId?: string;
	}) {
		const mistakes: Array<{
			questionId: string;
			questionText: string;
			incorrectCount: number;
			totalAttempts: number;
			errorRate: number;
			commonWrongAnswers: string[];
			suggestedRemediation: string;
		}> = [];

		// Analyze quiz responses
		if (filters?.quizId || !filters?.examPaperId) {
			const quizResponses = await this.prisma.quizResponse.findMany({
				where: {
					...(filters?.quizId && { attempt: { quizId: filters.quizId } }),
					isCorrect: false,
				},
				include: {
					question: { select: { id: true, questionText: true, type: true } },
				},
			});

			// Group by question
			const byQuestion = quizResponses.reduce(
				(acc, r) => {
					const qId = r.questionId;
					if (!acc[qId]) {
						acc[qId] = {
							question: r.question,
							wrongAnswers: [],
							count: 0,
						};
					}
					acc[qId].count++;
					if (r.response) {
						acc[qId].wrongAnswers.push(r.response);
					}
					return acc;
				},
				{} as Record<string, any>,
			);

			// Get total attempts per question
			for (const [questionId, data] of Object.entries(byQuestion)) {
				const totalAttempts = await this.prisma.quizResponse.count({
					where: { questionId },
				});

				mistakes.push({
					questionId,
					questionText: (data as any).question.questionText,
					incorrectCount: (data as any).count,
					totalAttempts,
					errorRate:
						totalAttempts > 0 ? ((data as any).count / totalAttempts) * 100 : 0,
					commonWrongAnswers: this.getMostCommon((data as any).wrongAnswers, 3),
					suggestedRemediation: this.getSuggestedRemediation(
						(data as any).question.type,
					),
				});
			}
		}

		// Sort by error rate
		mistakes.sort((a, b) => b.errorRate - a.errorRate);

		return {
			totalQuestionsAnalyzed: mistakes.length,
			highErrorQuestions: mistakes.filter((m) => m.errorRate >= 50).length,
			questions: mistakes.slice(0, 20),
		};
	}

	private getMostCommon(arr: string[], n: number): string[] {
		const counts = arr.reduce(
			(acc, val) => {
				acc[val] = (acc[val] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, n)
			.map(([val]) => val);
	}

	private getSuggestedRemediation(questionType: string): string {
		const remediations: Record<string, string> = {
			MULTIPLE_CHOICE:
				"Review answer explanations and provide additional examples",
			TRUE_FALSE: "Clarify the concept and provide context",
			SHORT_ANSWER: "Offer guided practice with feedback",
			ESSAY: "Provide sample responses and rubric explanation",
		};
		return (
			remediations[questionType] || "Review material with additional practice"
		);
	}

	// ========================
	// COMPLIANCE REPORTING (Spec 3A.4)
	// ========================

	/**
	 * Get compliance reports
	 * As per Spec 3A.4: "Compliance reports"
	 */
	async getComplianceReports() {
		const now = new Date();
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

		// Get audit logs
		const auditLogs = await this.prisma.auditLog.findMany({
			where: { createdAt: { gte: thirtyDaysAgo } },
			orderBy: { createdAt: "desc" },
			take: 1000,
		});

		// Categorize actions
		const actionCategories = auditLogs.reduce(
			(acc, log) => {
				const category = this.categorizeAction(log.action);
				if (!acc[category]) acc[category] = 0;
				acc[category]++;
				return acc;
			},
			{} as Record<string, number>,
		);

		// Data access patterns
		const dataAccessLogs = auditLogs.filter(
			(l) =>
				l.action.includes("VIEW") ||
				l.action.includes("READ") ||
				l.action.includes("EXPORT"),
		);

		// Sensitive data access
		const sensitiveAccess = auditLogs.filter(
			(l) =>
				l.action.includes("GRADE") ||
				l.action.includes("PAYMENT") ||
				l.action.includes("PERSONAL"),
		);

		// Get GDPR-related activities
		const gdprRequests = await this.prisma.auditLog.count({
			where: {
				action: {
					in: ["DATA_EXPORT_REQUEST", "DATA_DELETE_REQUEST", "CONSENT_UPDATE"],
				},
				createdAt: { gte: thirtyDaysAgo },
			},
		});

		// User account changes
		const accountChanges = auditLogs.filter(
			(l) =>
				l.action.includes("USER") ||
				l.action.includes("ROLE") ||
				l.action.includes("PERMISSION"),
		);

		return {
			period: { start: thirtyDaysAgo, end: now },
			summary: {
				totalAuditEvents: auditLogs.length,
				dataAccessEvents: dataAccessLogs.length,
				sensitiveDataAccess: sensitiveAccess.length,
				gdprRequests,
				accountChanges: accountChanges.length,
			},
			byCategory: Object.entries(actionCategories).map(([category, count]) => ({
				category,
				count,
			})),
			recentSensitiveAccess: sensitiveAccess.slice(0, 50).map((l) => ({
				action: l.action,
				userId: l.userId,
				entityType: l.entityType,
				timestamp: l.createdAt,
			})),
			recommendations: this.getComplianceRecommendations(auditLogs),
		};
	}

	private categorizeAction(action: string): string {
		if (action.includes("CREATE")) return "Data Creation";
		if (action.includes("UPDATE") || action.includes("EDIT"))
			return "Data Modification";
		if (action.includes("DELETE")) return "Data Deletion";
		if (action.includes("VIEW") || action.includes("READ"))
			return "Data Access";
		if (action.includes("LOGIN") || action.includes("AUTH"))
			return "Authentication";
		if (action.includes("EXPORT")) return "Data Export";
		if (action.includes("PAYMENT")) return "Financial";
		return "Other";
	}

	private getComplianceRecommendations(logs: any[]): string[] {
		const recommendations: string[] = [];

		// Check for unusual patterns
		const userActionCounts = logs.reduce<Record<string, number>>((acc, l) => {
			acc[l.userId] = (acc[l.userId] || 0) + 1;
			return acc;
		}, {});

		const values = Object.values(userActionCounts);
		const avgActions =
			values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

		for (const [userId, count] of Object.entries(userActionCounts)) {
			if (count > avgActions * 3) {
				recommendations.push(
					`Review activity for user ${userId} - unusually high action count`,
				);
			}
		}

		// Check for data exports
		const exportCount = logs.filter((l) => l.action.includes("EXPORT")).length;
		if (exportCount > 10) {
			recommendations.push(
				"Review data export activities - multiple exports detected",
			);
		}

		if (recommendations.length === 0) {
			recommendations.push("No compliance concerns detected in this period");
		}

		return recommendations;
	}

	// ========================
	// EXPORT UTILITIES
	// ========================

	/**
	 * Export report as XLSX (returns base64 encoded data)
	 * Note: Requires xlsx library for full implementation
	 */
	async exportReportXLSX(reportType: string, data: any): Promise<string> {
		// For now, return CSV format - XLSX would require the xlsx library
		let csv = "";

		switch (reportType) {
			case "enrollment":
				csv = this.convertEnrollmentToCSV(data);
				break;
			case "financial":
				csv = this.convertFinancialToCSV(data);
				break;
			case "atRisk":
				csv = this.convertAtRiskToCSV(data);
				break;
			default:
				csv = JSON.stringify(data, null, 2);
		}

		return Buffer.from(csv).toString("base64");
	}

	private convertEnrollmentToCSV(data: any): string {
		const headers = ["Course", "Enrollment Count"];
		const rows =
			data.topCourses?.map((c: any) => [c.courseTitle, c.enrollmentCount]) ||
			[];
		return [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
	}

	private convertFinancialToCSV(data: any): string {
		const headers = ["Date", "Revenue"];
		const rows =
			data.revenue?.dailyBreakdown?.map((d: any) => [d.date, d.amount]) || [];
		return [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
	}

	private convertAtRiskToCSV(data: any): string {
		const headers = [
			"Student Name",
			"Email",
			"Risk Level",
			"Risk Score",
			"Risk Factors",
		];
		const rows =
			data.students?.map((s: any) => [
				s.studentName,
				s.email,
				s.riskLevel,
				s.riskScore,
				s.riskFactors.join("; "),
			]) || [];
		return [
			headers.join(","),
			...rows.map((r: any) => r.map((c: any) => `"${c}"`).join(",")),
		].join("\n");
	}

	private getWeekKey(date: Date): string {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		d.setDate(d.getDate() - d.getDay()); // Start of week
		return d.toISOString().split("T")[0];
	}
}
