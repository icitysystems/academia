import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { PDFService } from "./pdf.service";
import { PDFOutput } from "./models/pdf-output.model";
import { PrintJob } from "./models/print-job.model";
import { BatchPDFResult } from "./models/batch-pdf-result.model";
import { GeneratePDFInput, PDFOptionsInput } from "./dto/generate-pdf.input";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Resolver()
@UseGuards(GqlAuthGuard)
export class PDFResolver {
	constructor(private pdfService: PDFService) {}

	@Mutation(() => PDFOutput)
	async generatePDF(@Args("input") input: GeneratePDFInput) {
		return this.pdfService.generateGradedPDF(input.sheetId, input.options);
	}

	@Mutation(() => BatchPDFResult)
	async batchGeneratePDFs(
		@Args("sheetIds", { type: () => [ID] }) sheetIds: string[],
		@Args("options", { type: () => PDFOptionsInput, nullable: true })
		options?: PDFOptionsInput,
	) {
		return this.pdfService.batchGeneratePDFs(sheetIds, options);
	}

	@Query(() => PDFOutput, { nullable: true })
	async sheetPDF(@Args("sheetId", { type: () => ID }) sheetId: string) {
		return this.pdfService.getPDF(sheetId);
	}

	@Query(() => [PDFOutput])
	async templatePDFs(
		@Args("templateId", { type: () => ID }) templateId: string,
	) {
		return this.pdfService.getPDFsByTemplate(templateId);
	}

	@Mutation(() => PrintJob)
	async createPrintJob(
		@Args("pdfId", { type: () => ID }) pdfId: string,
		@Args("printerName", { nullable: true }) printerName?: string,
		@Args("copies", { nullable: true, defaultValue: 1 }) copies?: number,
	) {
		return this.pdfService.createPrintJob(pdfId, printerName, copies);
	}

	@Query(() => [PrintJob])
	async printJobs(@Args("status", { nullable: true }) status?: string) {
		return this.pdfService.getPrintJobs(status);
	}
}
