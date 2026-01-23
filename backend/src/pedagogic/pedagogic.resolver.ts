import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PedagogicService } from "./pedagogic.service";
import {
	SchemeOfWork,
	ProgressionRecord,
	GeneratedPresentation,
	ExamPaper,
	QuestionBankItem,
	SchemeOfWorkList,
	ExamPaperList,
	QuestionBankList,
	PresentationList,
} from "./models/pedagogic.model";
import {
	GenerateSchemeInput,
	UpdateSchemeInput,
	ApproveSchemeInput,
	CreateProgressionInput,
	UpdateProgressionInput,
	GeneratePresentationInput,
	UpdatePresentationInput,
	CreateExamPaperInput,
	UpdateExamPaperInput,
	ExamPaperFilterInput,
	CreateQuestionInput,
	UpdateQuestionInput,
	QuestionFilterInput,
} from "./dto/pedagogic.dto";

@Resolver()
export class PedagogicResolver {
	constructor(private pedagogicService: PedagogicService) {}

	// ========== Scheme of Work ==========

	@Query(() => SchemeOfWork, { nullable: true })
	@UseGuards(GqlAuthGuard)
	async schemeOfWork(@Args("id") id: string) {
		return this.pedagogicService.getScheme(id);
	}

	@Query(() => SchemeOfWork, { nullable: true })
	@UseGuards(GqlAuthGuard)
	async schemeOfWorkBySyllabus(@Args("syllabusId") syllabusId: string) {
		return this.pedagogicService.getSchemeBySyllabus(syllabusId);
	}

	@Mutation(() => SchemeOfWork)
	@UseGuards(GqlAuthGuard)
	async generateSchemeOfWork(
		@CurrentUser() user: any,
		@Args("input") input: GenerateSchemeInput,
	) {
		return this.pedagogicService.generateScheme(user.id, input);
	}

	@Mutation(() => SchemeOfWork)
	@UseGuards(GqlAuthGuard)
	async updateSchemeOfWork(
		@CurrentUser() user: any,
		@Args("id") id: string,
		@Args("input") input: UpdateSchemeInput,
	) {
		return this.pedagogicService.updateScheme(id, user.id, input);
	}

	@Mutation(() => SchemeOfWork)
	@UseGuards(GqlAuthGuard)
	async approveSchemeOfWork(
		@CurrentUser() user: any,
		@Args("input") input: ApproveSchemeInput,
	) {
		return this.pedagogicService.approveScheme(input.schemeId, user.id);
	}

	@Mutation(() => Boolean)
	@UseGuards(GqlAuthGuard)
	async deleteSchemeOfWork(@CurrentUser() user: any, @Args("id") id: string) {
		return this.pedagogicService.deleteScheme(id, user.id);
	}

	// ========== Progression Records ==========

	@Query(() => [ProgressionRecord])
	@UseGuards(GqlAuthGuard)
	async progressionRecords(
		@Args("classSubjectId") classSubjectId: string,
		@Args("teacherId", { nullable: true }) teacherId?: string,
	) {
		return this.pedagogicService.getProgressionRecords(
			classSubjectId,
			teacherId,
		);
	}

	@Mutation(() => ProgressionRecord)
	@UseGuards(GqlAuthGuard)
	async createProgressionRecord(
		@CurrentUser() user: any,
		@Args("input") input: CreateProgressionInput,
	) {
		return this.pedagogicService.createProgressionRecord(user.id, input);
	}

	@Mutation(() => ProgressionRecord)
	@UseGuards(GqlAuthGuard)
	async updateProgressionRecord(
		@CurrentUser() user: any,
		@Args("id") id: string,
		@Args("input") input: UpdateProgressionInput,
	) {
		return this.pedagogicService.updateProgressionRecord(id, user.id, input);
	}

	// ========== Presentations ==========

	@Query(() => GeneratedPresentation, { nullable: true })
	@UseGuards(GqlAuthGuard)
	async presentation(@Args("id") id: string) {
		return this.pedagogicService.getPresentation(id);
	}

	@Query(() => [GeneratedPresentation])
	@UseGuards(GqlAuthGuard)
	async myPresentations(@CurrentUser() user: any) {
		return this.pedagogicService.getUserPresentations(user.id);
	}

	@Mutation(() => GeneratedPresentation)
	@UseGuards(GqlAuthGuard)
	async generatePresentation(
		@CurrentUser() user: any,
		@Args("input") input: GeneratePresentationInput,
	) {
		return this.pedagogicService.generatePresentation(user.id, input);
	}

	@Mutation(() => GeneratedPresentation)
	@UseGuards(GqlAuthGuard)
	async updatePresentation(
		@CurrentUser() user: any,
		@Args("id") id: string,
		@Args("input") input: UpdatePresentationInput,
	) {
		return this.pedagogicService.updatePresentation(id, user.id, input);
	}

	@Mutation(() => Boolean)
	@UseGuards(GqlAuthGuard)
	async deletePresentation(@CurrentUser() user: any, @Args("id") id: string) {
		return this.pedagogicService.deletePresentation(id, user.id);
	}

	// ========== Exam Papers ==========

	@Query(() => ExamPaper, { nullable: true })
	@UseGuards(GqlAuthGuard)
	async examPaper(@Args("id") id: string) {
		return this.pedagogicService.getExamPaper(id);
	}

	@Query(() => ExamPaperList)
	@UseGuards(GqlAuthGuard)
	async examPapers(
		@Args("filter", { nullable: true })
		filter: ExamPaperFilterInput = { page: 1, pageSize: 10 },
	) {
		return this.pedagogicService.getExamPapers(filter);
	}

	@Query(() => ExamPaperList)
	@UseGuards(GqlAuthGuard)
	async myExamPapers(
		@CurrentUser() user: any,
		@Args("filter", { nullable: true })
		filter: ExamPaperFilterInput = { page: 1, pageSize: 10 },
	) {
		return this.pedagogicService.getExamPapers(filter, user.id);
	}

	@Mutation(() => ExamPaper)
	@UseGuards(GqlAuthGuard)
	async createExamPaper(
		@CurrentUser() user: any,
		@Args("input") input: CreateExamPaperInput,
	) {
		return this.pedagogicService.createExamPaper(user.id, input);
	}

	@Mutation(() => ExamPaper)
	@UseGuards(GqlAuthGuard)
	async updateExamPaper(
		@CurrentUser() user: any,
		@Args("id") id: string,
		@Args("input") input: UpdateExamPaperInput,
	) {
		return this.pedagogicService.updateExamPaper(id, user.id, input);
	}

	@Mutation(() => Boolean)
	@UseGuards(GqlAuthGuard)
	async deleteExamPaper(@CurrentUser() user: any, @Args("id") id: string) {
		return this.pedagogicService.deleteExamPaper(id, user.id);
	}

	// ========== Question Bank ==========

	@Query(() => QuestionBankItem, { nullable: true })
	@UseGuards(GqlAuthGuard)
	async question(@Args("id") id: string) {
		return this.pedagogicService.getQuestion(id);
	}

	@Query(() => QuestionBankList)
	@UseGuards(GqlAuthGuard)
	async questions(
		@CurrentUser() user: any,
		@Args("filter", { nullable: true })
		filter: QuestionFilterInput = { page: 1, pageSize: 10 },
	) {
		return this.pedagogicService.getQuestions(filter, user.id);
	}

	@Query(() => QuestionBankList)
	@UseGuards(GqlAuthGuard)
	async publicQuestions(
		@Args("filter", { nullable: true })
		filter: QuestionFilterInput = { page: 1, pageSize: 10 },
	) {
		return this.pedagogicService.getQuestions({ ...filter, isPublic: true });
	}

	@Mutation(() => QuestionBankItem)
	@UseGuards(GqlAuthGuard)
	async createQuestion(
		@CurrentUser() user: any,
		@Args("input") input: CreateQuestionInput,
	) {
		return this.pedagogicService.createQuestion(user.id, input);
	}

	@Mutation(() => QuestionBankItem)
	@UseGuards(GqlAuthGuard)
	async updateQuestion(
		@CurrentUser() user: any,
		@Args("id") id: string,
		@Args("input") input: UpdateQuestionInput,
	) {
		return this.pedagogicService.updateQuestion(id, user.id, input);
	}

	@Mutation(() => Boolean)
	@UseGuards(GqlAuthGuard)
	async deleteQuestion(@CurrentUser() user: any, @Args("id") id: string) {
		return this.pedagogicService.deleteQuestion(id, user.id);
	}
}
