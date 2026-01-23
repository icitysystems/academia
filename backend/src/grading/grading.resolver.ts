import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GradingService } from "./grading.service";
import { GradingJob } from "./models/grading-job.model";
import { GradingResult } from "./models/grading-result.model";
import { GradingStats } from "./models/grading-stats.model";
import { StartGradingInput } from "./dto/start-grading.input";
import { ReviewResultInput } from "./dto/review-result.input";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Resolver()
@UseGuards(GqlAuthGuard)
export class GradingResolver {
	constructor(private gradingService: GradingService) {}

	@Mutation(() => GradingJob)
	async startGrading(
		@Args("input") input: StartGradingInput,
		@CurrentUser() user: any,
	) {
		return this.gradingService.startBatchGrading(
			input.templateId,
			input.sheetIds,
			user.sub,
		);
	}

	@Query(() => GradingJob)
	async gradingJob(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.gradingService.getJob(id, user.sub);
	}

	@Query(() => [GradingJob])
	async gradingJobs(
		@CurrentUser() user: any,
		@Args("templateId", { type: () => ID, nullable: true }) templateId?: string,
	) {
		return this.gradingService.getJobs(user.sub, templateId);
	}

	@Query(() => [GradingResult])
	async sheetGradingResults(
		@Args("sheetId", { type: () => ID }) sheetId: string,
		@CurrentUser() user: any,
	) {
		return this.gradingService.getSheetResults(sheetId, user.sub);
	}

	@Query(() => [GradingResult])
	async resultsNeedingReview(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.gradingService.getResultsNeedingReview(templateId, user.sub);
	}

	@Mutation(() => GradingResult)
	async reviewGradingResult(
		@Args("input") input: ReviewResultInput,
		@CurrentUser() user: any,
	) {
		return this.gradingService.reviewResult(input.resultId, user.sub, {
			assignedScore: input.assignedScore,
			predictedCorrectness: input.predictedCorrectness,
		});
	}

	@Query(() => GradingStats)
	async gradingStats(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.gradingService.getGradingStats(templateId, user.sub);
	}
}
