import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { SheetsService } from "./sheets.service";
import { AnswerSheet } from "./models/answer-sheet.model";
import { BatchUploadResult } from "./models/batch-upload-result.model";
import { SheetStatusCount } from "./models/sheet-status-count.model";
import { UploadSheetInput } from "./dto/upload-sheet.input";
import { BatchUploadInput } from "./dto/batch-upload.input";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Resolver(() => AnswerSheet)
@UseGuards(GqlAuthGuard)
export class SheetsResolver {
	constructor(private sheetsService: SheetsService) {}

	@Mutation(() => AnswerSheet)
	async uploadSheet(
		@Args("input") input: UploadSheetInput,
		@CurrentUser() user: any,
	) {
		return this.sheetsService.uploadSheet(input, user.sub);
	}

	@Mutation(() => BatchUploadResult)
	async batchUploadSheets(
		@Args("input") input: BatchUploadInput,
		@CurrentUser() user: any,
	) {
		return this.sheetsService.batchUpload(input, user.sub);
	}

	@Query(() => [AnswerSheet])
	async sheets(
		@CurrentUser() user: any,
		@Args("templateId", { type: () => ID, nullable: true }) templateId?: string,
		@Args("status", { nullable: true }) status?: string,
	) {
		return this.sheetsService.findAll(user.sub, templateId, status);
	}

	@Query(() => AnswerSheet)
	async sheet(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.sheetsService.findOne(id, user.sub);
	}

	@Mutation(() => AnswerSheet)
	async deleteSheet(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.sheetsService.delete(id, user.sub);
	}

	@Mutation(() => AnswerSheet)
	async reprocessSheet(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.sheetsService.reprocess(id, user.sub);
	}

	@Query(() => [SheetStatusCount])
	async sheetsByStatus(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.sheetsService.getSheetsByStatus(user.sub, templateId);
	}
}
