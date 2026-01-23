import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { StorageService } from "../storage/storage.service";
import * as PDFDocument from "pdfkit";
import * as sharp from "sharp";

export interface PDFGenerationOptions {
	includeOverlay: boolean;
	includeScoreBreakdown: boolean;
	includeConfidence: boolean;
	overlayColor: string;
	fontSize: number;
	pageSize?: "A4" | "LETTER";
	margin?: number;
}

const DEFAULT_OPTIONS: PDFGenerationOptions = {
	includeOverlay: true,
	includeScoreBreakdown: true,
	includeConfidence: false,
	overlayColor: "#FF0000",
	fontSize: 12,
	pageSize: "A4",
	margin: 50,
};

@Injectable()
export class PDFService {
	private readonly logger = new Logger(PDFService.name);

	constructor(
		private prisma: PrismaService,
		private storageService: StorageService,
	) {}

	/**
	 * Generate a graded PDF for a sheet
	 */
	async generateGradedPDF(
		sheetId: string,
		options: Partial<PDFGenerationOptions> = {},
	) {
		const opts = { ...DEFAULT_OPTIONS, ...options };

		const sheet = await this.prisma.answerSheet.findUnique({
			where: { id: sheetId },
			include: {
				template: {
					include: { regions: { orderBy: { orderIndex: "asc" } } },
				},
				gradingResults: {
					include: { region: true },
				},
			},
		});

		if (!sheet) {
			throw new NotFoundException("Sheet not found");
		}

		// Calculate scores
		let totalScore = 0;
		let maxScore = 0;
		const breakdown: Array<{
			question: string;
			score: number;
			maxScore: number;
			correctness: string;
			confidence: number;
		}> = [];

		for (const result of sheet.gradingResults) {
			totalScore += result.assignedScore;
			maxScore += result.region.points;

			breakdown.push({
				question: result.region.label,
				score: result.assignedScore,
				maxScore: result.region.points,
				correctness: result.predictedCorrectness,
				confidence: result.confidence,
			});
		}

		// Generate PDF
		const pdfBuffer = await this.createPDF(
			sheet,
			breakdown,
			totalScore,
			maxScore,
			opts,
		);

		// Upload to storage
		const uploadResult = await this.storageService.uploadFile(
			pdfBuffer,
			`${sheet.studentName || sheet.id}_graded.pdf`,
			"pdfs",
			"application/pdf",
		);

		// Save PDF output record
		const pdfOutput = await this.prisma.pDFOutput.upsert({
			where: { sheetId },
			update: {
				pdfUrl: uploadResult.url,
				totalScore,
				maxScore,
				breakdown: breakdown as any,
			},
			create: {
				sheetId,
				pdfUrl: uploadResult.url,
				totalScore,
				maxScore,
				breakdown: breakdown as any,
			},
		});

		return pdfOutput;
	}

	/**
	 * Create PDF document
	 */
	private async createPDF(
		sheet: any,
		breakdown: Array<{
			question: string;
			score: number;
			maxScore: number;
			correctness: string;
			confidence: number;
		}>,
		totalScore: number,
		maxScore: number,
		options: PDFGenerationOptions,
	): Promise<Buffer> {
		return new Promise(async (resolve, reject) => {
			try {
				const doc = new PDFDocument({
					size: options.pageSize,
					margin: options.margin,
				});

				const chunks: Buffer[] = [];
				doc.on("data", (chunk) => chunks.push(chunk));
				doc.on("end", () => resolve(Buffer.concat(chunks)));
				doc.on("error", reject);

				const percentage =
					maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(1) : "0";
				const grade = this.calculateGrade(totalScore, maxScore);

				// Header
				doc.fontSize(20).font("Helvetica-Bold");
				doc.text("Academia - Score Report", { align: "center" });
				doc.moveDown();

				// Student info
				doc.fontSize(12).font("Helvetica");
				doc.text(`Student: ${sheet.studentName || "Unknown"}`, {
					continued: false,
				});
				doc.text(`Student ID: ${sheet.studentId || "N/A"}`);
				doc.text(`Template: ${sheet.template.name}`);
				doc.text(`Date: ${new Date().toLocaleDateString()}`);
				doc.moveDown();

				// Score summary box
				doc.rect(doc.x, doc.y, 200, 80).stroke(options.overlayColor);
				const summaryX = doc.x + 10;
				const summaryY = doc.y + 10;

				doc.fontSize(14).font("Helvetica-Bold");
				doc.text("Score Summary", summaryX, summaryY);

				doc.fontSize(28).fillColor(options.overlayColor);
				doc.text(`${totalScore}/${maxScore}`, summaryX, summaryY + 20);

				doc.fontSize(16).fillColor("black");
				doc.text(`${percentage}% - Grade: ${grade}`, summaryX, summaryY + 50);

				doc.y = summaryY + 90;
				doc.moveDown();

				// Score breakdown table
				if (options.includeScoreBreakdown && breakdown.length > 0) {
					doc.fontSize(14).font("Helvetica-Bold");
					doc.text("Score Breakdown", { underline: true });
					doc.moveDown(0.5);

					// Table header
					const tableTop = doc.y;
					const col1 = doc.x;
					const col2 = col1 + 200;
					const col3 = col2 + 80;
					const col4 = col3 + 80;
					const col5 = col4 + 80;

					doc.fontSize(10).font("Helvetica-Bold");
					doc.text("Question", col1, tableTop);
					doc.text("Score", col2, tableTop);
					doc.text("Status", col3, tableTop);
					if (options.includeConfidence) {
						doc.text("Confidence", col4, tableTop);
					}

					doc
						.moveTo(col1, tableTop + 15)
						.lineTo(col5, tableTop + 15)
						.stroke();

					// Table rows
					let rowY = tableTop + 20;
					doc.font("Helvetica");

					for (const item of breakdown) {
						if (rowY > doc.page.height - 100) {
							doc.addPage();
							rowY = doc.y;
						}

						// Color code by correctness
						const statusColor = this.getStatusColor(item.correctness);

						doc.fillColor("black").text(item.question, col1, rowY);
						doc.text(`${item.score}/${item.maxScore}`, col2, rowY);
						doc.fillColor(statusColor).text(item.correctness, col3, rowY);
						if (options.includeConfidence) {
							doc
								.fillColor("black")
								.text(`${(item.confidence * 100).toFixed(0)}%`, col4, rowY);
						}

						rowY += 18;
					}

					doc.fillColor("black");
				}

				// Add original sheet image if available
				if (sheet.processedUrl || sheet.originalUrl) {
					doc.addPage();
					doc.fontSize(14).font("Helvetica-Bold");
					doc.text("Original Answer Sheet", { align: "center" });
					doc.moveDown();

					try {
						const imageUrl = sheet.processedUrl || sheet.originalUrl;
						const key = this.storageService.extractKeyFromUrl(imageUrl);
						if (key) {
							const imageBuffer = await this.storageService.getFile(key);

							// Resize image to fit page
							const resizedImage = await sharp(imageBuffer)
								.resize(500, 700, { fit: "inside" })
								.jpeg()
								.toBuffer();

							doc.image(resizedImage, {
								fit: [500, 700],
								align: "center",
							});
						}
					} catch (error) {
						this.logger.warn(`Could not include sheet image: ${error.message}`);
						doc.text("(Image not available)", { align: "center" });
					}
				}

				// Footer
				doc.fontSize(8).font("Helvetica").fillColor("gray");
				const footerY = doc.page.height - 40;
				doc.text(
					`Generated by Academia on ${new Date().toISOString()} | Page 1`,
					options.margin!,
					footerY,
					{ align: "center" },
				);

				doc.end();
			} catch (error) {
				reject(error);
			}
		});
	}

	private getStatusColor(correctness: string): string {
		switch (correctness) {
			case "CORRECT":
				return "#22c55e"; // green
			case "PARTIAL":
				return "#f59e0b"; // amber
			case "INCORRECT":
				return "#ef4444"; // red
			case "SKIPPED":
				return "#6b7280"; // gray
			default:
				return "#000000";
		}
	}

	/**
	 * Calculate letter grade
	 */
	private calculateGrade(score: number, maxScore: number): string {
		if (maxScore === 0) return "N/A";
		const percentage = (score / maxScore) * 100;

		if (percentage >= 90) return "A";
		if (percentage >= 80) return "B";
		if (percentage >= 70) return "C";
		if (percentage >= 60) return "D";
		return "F";
	}

	/**
	 * Batch generate PDFs
	 */
	async batchGeneratePDFs(
		sheetIds: string[],
		options?: Partial<PDFGenerationOptions>,
	) {
		const results: Array<{
			sheetId: string;
			success: boolean;
			pdf?: any;
			error?: string;
		}> = [];

		for (const sheetId of sheetIds) {
			try {
				const pdf = await this.generateGradedPDF(sheetId, options);
				results.push({ sheetId, success: true, pdf });
			} catch (error) {
				results.push({ sheetId, success: false, error: error.message });
			}
		}

		return {
			total: sheetIds.length,
			successful: results.filter((r) => r.success).length,
			failed: results.filter((r) => !r.success).length,
			results,
		};
	}

	/**
	 * Get PDF for a sheet
	 */
	async getPDF(sheetId: string) {
		return this.prisma.pDFOutput.findUnique({
			where: { sheetId },
			include: { sheet: true },
		});
	}

	/**
	 * Get all PDFs for a template
	 */
	async getPDFsByTemplate(templateId: string) {
		return this.prisma.pDFOutput.findMany({
			where: {
				sheet: { templateId },
			},
			include: {
				sheet: true,
			},
			orderBy: { createdAt: "desc" },
		});
	}

	/**
	 * Create a print job
	 */
	async createPrintJob(
		pdfId: string,
		printerName?: string,
		copies: number = 1,
	) {
		return this.prisma.printJob.create({
			data: {
				pdfId,
				printerName,
				copies,
				status: "QUEUED",
			},
		});
	}

	/**
	 * Get print jobs
	 */
	async getPrintJobs(status?: string) {
		return this.prisma.printJob.findMany({
			where: status ? { status: status as any } : {},
			include: {
				pdf: {
					include: { sheet: true },
				},
			},
			orderBy: { queuedAt: "desc" },
		});
	}

	/**
	 * Generate class report PDF
	 */
	async generateClassReportPDF(
		templateId: string,
		teacherId: string,
	): Promise<Buffer> {
		const template = await this.prisma.template.findUnique({
			where: { id: templateId },
			include: { regions: true },
		});

		if (!template || template.createdById !== teacherId) {
			throw new NotFoundException("Template not found");
		}

		const pdfOutputs = await this.prisma.pDFOutput.findMany({
			where: { sheet: { templateId } },
			include: { sheet: true },
		});

		return new Promise((resolve, reject) => {
			const doc = new PDFDocument({ size: "A4", margin: 50 });
			const chunks: Buffer[] = [];

			doc.on("data", (chunk) => chunks.push(chunk));
			doc.on("end", () => resolve(Buffer.concat(chunks)));
			doc.on("error", reject);

			// Title
			doc.fontSize(20).font("Helvetica-Bold");
			doc.text("Class Performance Report", { align: "center" });
			doc.moveDown();

			doc.fontSize(12).font("Helvetica");
			doc.text(`Template: ${template.name}`);
			doc.text(`Total Students: ${pdfOutputs.length}`);
			doc.text(`Generated: ${new Date().toLocaleDateString()}`);
			doc.moveDown();

			if (pdfOutputs.length > 0) {
				// Calculate statistics
				const percentages = pdfOutputs.map((p) =>
					p.maxScore > 0 ? (p.totalScore / p.maxScore) * 100 : 0,
				);
				const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length;
				const max = Math.max(...percentages);
				const min = Math.min(...percentages);
				const passRate =
					(percentages.filter((p) => p >= 60).length / percentages.length) *
					100;

				// Summary stats
				doc.fontSize(14).font("Helvetica-Bold");
				doc.text("Summary Statistics");
				doc.moveDown(0.5);

				doc.fontSize(11).font("Helvetica");
				doc.text(`Average Score: ${avg.toFixed(1)}%`);
				doc.text(`Highest Score: ${max.toFixed(1)}%`);
				doc.text(`Lowest Score: ${min.toFixed(1)}%`);
				doc.text(`Pass Rate (≥60%): ${passRate.toFixed(1)}%`);
				doc.moveDown();

				// Individual scores table
				doc.fontSize(14).font("Helvetica-Bold");
				doc.text("Individual Scores");
				doc.moveDown(0.5);

				doc.fontSize(10).font("Helvetica-Bold");
				doc.text("Student", 50, doc.y, { continued: true });
				doc.text("Score", 200, doc.y, { continued: true });
				doc.text("Percentage", 300, doc.y, { continued: true });
				doc.text("Grade", 400, doc.y);
				doc.moveDown(0.5);

				doc.font("Helvetica");
				for (const output of pdfOutputs) {
					const pct =
						output.maxScore > 0
							? (output.totalScore / output.maxScore) * 100
							: 0;
					const grade = this.calculateGrade(output.totalScore, output.maxScore);

					doc.text(
						output.sheet.studentName || output.sheet.studentId || "Unknown",
						50,
						doc.y,
					);
					doc.text(`${output.totalScore}/${output.maxScore}`, 200, doc.y);
					doc.text(`${pct.toFixed(1)}%`, 300, doc.y);
					doc.text(grade, 400, doc.y);
					doc.moveDown(0.3);
				}
			}

			doc.end();
		});
	}
}
