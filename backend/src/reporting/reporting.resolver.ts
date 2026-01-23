import { Resolver, Query, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { ReportingService } from "./reporting.service";
import { ClassSummary } from "./models/class-summary.model";
import { QuestionAnalysis } from "./models/question-analysis.model";
import { StudentReport } from "./models/student-report.model";
import { ScoreDistribution } from "./models/score-distribution.model";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Resolver()
@UseGuards(GqlAuthGuard)
export class ReportingResolver {
	constructor(private reportingService: ReportingService) {}

	@Query(() => ClassSummary)
	async classSummary(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.reportingService.getClassSummary(templateId, user.sub);
	}

	@Query(() => [QuestionAnalysis])
	async questionAnalysis(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.reportingService.getQuestionAnalysis(templateId, user.sub);
	}

	@Query(() => StudentReport)
	async studentReport(
		@Args("studentId") studentId: string,
		@CurrentUser() user: any,
	) {
		return this.reportingService.getStudentReport(studentId, user.sub);
	}

	@Query(() => String)
	async exportResultsCSV(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.reportingService.exportResultsCSV(templateId, user.sub);
	}

	@Query(() => [ScoreDistribution])
	async scoreDistribution(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.reportingService.getScoreDistribution(templateId, user.sub);
	}
}
