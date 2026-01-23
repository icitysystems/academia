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

export interface QuestionAnalysis {
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
	): Promise<QuestionAnalysis[]> {
		const template = await this.prisma.template.findUnique({
			where: { id: templateId },
			include: { regions: true },
		});

		if (!template || template.createdById !== teacherId) {
			throw new Error("Template not found");
		}

		const analysis: QuestionAnalysis[] = [];

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
