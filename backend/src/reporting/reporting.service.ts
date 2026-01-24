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
}
