import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql"
import { GraphQLJSON } from 'graphql-type-json';
import { UseGuards } from "@nestjs/common";
import { GradingWorkflowService } from "../services/grading-workflow.service";
import {
	ExamPaperSetup,
	ExamQuestion,
	ExpectedResponse,
	ProposedResponses,
	ModerationSample,
	CalibrationResult,
	StudentExamSubmission,
	StudentResponse,
	ExamGradingSession,
	GradingSummary,
} from "../models";
import {
	CreateExamPaperInput,
	UpdateExamPaperInput,
	CreateExamQuestionInput,
	UpdateExamQuestionInput,
	BulkCreateQuestionsInput,
	CreateExpectedResponseInput,
	BulkExpectedResponseInput,
	RequestAIProposalInput,
	AcceptAIResponsesInput,
	CreateModerationSampleInput,
	VerifyModerationSampleInput,
	RunCalibrationInput,
	CreateStudentSubmissionInput,
	BulkUploadSubmissionsInput,
	StartBatchGradingInput,
	ReviewResponseInput,
	FinalizeGradingInput,
} from "../dto";
import { GqlAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Resolver()
@UseGuards(GqlAuthGuard)
export class GradingWorkflowResolver {
	constructor(private workflowService: GradingWorkflowService) {}

	// ============================
	// STEP 1: Exam Paper Setup
	// ============================

	@Mutation(() => ExamPaperSetup)
	async createExamPaper(
		@Args("input") input: CreateExamPaperInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.createExamPaper(input, user.sub);
	}

	@Mutation(() => ExamPaperSetup)
	async updateExamPaper(
		@Args("input") input: UpdateExamPaperInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.updateExamPaper(input, user.sub);
	}

	@Query(() => ExamPaperSetup)
	async examPaper(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.workflowService.getExamPaper(id, user.sub);
	}

	@Query(() => [ExamPaperSetup])
	async examPapers(
		@CurrentUser() user: any,
		@Args("status", { nullable: true }) status?: string,
	) {
		return this.workflowService.getExamPapers(user.sub, status);
	}

	@Mutation(() => ExamPaperSetup)
	async deleteExamPaper(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.workflowService.deleteExamPaper(id, user.sub);
	}

	// ============================
	// STEP 1.5: Questions
	// ============================

	@Mutation(() => ExamQuestion)
	async addExamQuestion(
		@Args("input") input: CreateExamQuestionInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.addQuestion(input, user.sub);
	}

	@Mutation(() => [ExamQuestion])
	async bulkAddExamQuestions(
		@Args("input") input: BulkCreateQuestionsInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.bulkAddQuestions(input, user.sub);
	}

	@Mutation(() => ExamQuestion)
	async updateExamQuestion(
		@Args("input") input: UpdateExamQuestionInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.updateQuestion(input, user.sub);
	}

	@Mutation(() => ExamQuestion)
	async deleteExamQuestion(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.workflowService.deleteQuestion(id, user.sub);
	}

	// ============================
	// STEP 2: Expected Responses
	// ============================

	@Mutation(() => ExpectedResponse)
	async addExpectedResponse(
		@Args("input") input: CreateExpectedResponseInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.addExpectedResponse(input, user.sub);
	}

	@Mutation(() => [ExpectedResponse])
	async bulkAddExpectedResponses(
		@Args("input") input: BulkExpectedResponseInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.bulkAddExpectedResponses(input, user.sub);
	}

	@Query(() => ProposedResponses)
	async requestAIProposedResponses(
		@Args("input") input: RequestAIProposalInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.requestAIProposedResponses(
			input.examPaperId,
			user.sub,
			input.style,
		);
	}

	@Mutation(() => [ExpectedResponse])
	async acceptAIResponses(
		@Args("input") input: AcceptAIResponsesInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.acceptAIResponses(
			input.examPaperId,
			user.sub,
			input.questionIds,
		);
	}

	// ============================
	// STEP 3: Moderation Samples
	// ============================

	@Mutation(() => ModerationSample)
	async addModerationSample(
		@Args("input") input: CreateModerationSampleInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.addModerationSample(input, user.sub);
	}

	@Query(() => [ModerationSample])
	async moderationSamples(
		@Args("examPaperId", { type: () => ID }) examPaperId: string,
		@CurrentUser() user: any,
	) {
		return this.workflowService.getModerationSamples(examPaperId, user.sub);
	}

	@Mutation(() => ModerationSample)
	async verifyModerationSample(
		@Args("input") input: VerifyModerationSampleInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.verifyModerationSample(
			input.id,
			input.isVerified,
			user.sub,
		);
	}

	@Mutation(() => CalibrationResult)
	async runCalibration(
		@Args("input") input: RunCalibrationInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.runCalibration(input.examPaperId, user.sub);
	}

	// ============================
	// STEP 4: Student Submissions & Grading
	// ============================

	@Mutation(() => StudentExamSubmission)
	async addStudentSubmission(
		@Args("input") input: CreateStudentSubmissionInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.addStudentSubmission(input, user.sub);
	}

	@Mutation(() => [StudentExamSubmission])
	async bulkUploadSubmissions(
		@Args("input") input: BulkUploadSubmissionsInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.bulkUploadSubmissions(input, user.sub);
	}

	@Query(() => [StudentExamSubmission])
	async studentSubmissions(
		@Args("examPaperId", { type: () => ID }) examPaperId: string,
		@CurrentUser() user: any,
		@Args("status", { nullable: true }) status?: string,
	) {
		return this.workflowService.getStudentSubmissions(
			examPaperId,
			user.sub,
			status,
		);
	}

	@Mutation(() => ExamGradingSession)
	async startExamBatchGrading(
		@Args("input") input: StartBatchGradingInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.startBatchGrading(input, user.sub);
	}

	@Mutation(() => StudentResponse)
	async reviewStudentResponse(
		@Args("input") input: ReviewResponseInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.reviewResponse(input, user.sub);
	}

	// ============================
	// STEP 5: Review & Adjustment (Spec 5A.5)
	// ============================

	/**
	 * Get responses needing review with priority-based sorting
	 * As per Specification 5A.5: "Smart prioritization (low-confidence scripts first)"
	 */
	@Query(() => GraphQLJSON, { name: "responsesNeedingReview" })
	async getResponsesNeedingReview(
		@Args("examPaperId", { type: () => ID }) examPaperId: string,
		@CurrentUser() user: any,
		@Args("priority", { nullable: true }) priority?: string,
		@Args("limit", { type: () => Number, nullable: true }) limit?: number,
		@Args("questionId", { type: () => ID, nullable: true }) questionId?: string,
	) {
		return this.workflowService.getResponsesNeedingReview(
			examPaperId,
			user.sub,
			{
				priority,
				limit,
				questionId,
			},
		);
	}

	/**
	 * Batch approve high-confidence responses
	 * As per Specification 5A.5: "Bulk approval for high-confidence grades"
	 */
	@Mutation(() => GraphQLJSON, { name: "batchApproveHighConfidence" })
	async batchApproveHighConfidence(
		@Args("examPaperId", { type: () => ID }) examPaperId: string,
		@CurrentUser() user: any,
	) {
		return this.workflowService.batchApproveHighConfidence(
			examPaperId,
			user.sub,
		);
	}

	// ============================
	// STEP 6: Reporting & Analytics (Spec 5A.6)
	// ============================

	@Query(() => GradingSummary)
	async examGradingSummary(
		@Args("examPaperId", { type: () => ID }) examPaperId: string,
		@CurrentUser() user: any,
	) {
		return this.workflowService.getGradingSummary(examPaperId, user.sub);
	}

	@Mutation(() => ExamPaperSetup)
	async finalizeExamGrading(
		@Args("input") input: FinalizeGradingInput,
		@CurrentUser() user: any,
	) {
		return this.workflowService.finalizeGrading(
			input.examPaperId,
			user.sub,
			input.publishResults,
		);
	}
}

