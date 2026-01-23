import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { QuizzesService } from "./quizzes.service";
import {
	OnlineQuiz,
	QuizQuestion,
	QuizAttempt,
	QuizResponse,
	QuizListResult,
	QuizStats,
} from "./models/quiz.model";
import {
	CreateQuizInput,
	UpdateQuizInput,
	QuizFilterInput,
	CreateQuizQuestionInput,
	UpdateQuizQuestionInput,
	StartAttemptInput,
	SubmitResponseInput,
	SubmitAttemptInput,
	GradeAttemptInput,
} from "./dto/quiz.dto";

@Resolver(() => OnlineQuiz)
export class QuizzesResolver {
	constructor(private quizzesService: QuizzesService) {}

	// ========== Quiz Queries ==========

	@Query(() => OnlineQuiz)
	@UseGuards(GqlAuthGuard)
	async quiz(@Args("id") id: string) {
		return this.quizzesService.getQuiz(id);
	}

	@Query(() => QuizListResult)
	@UseGuards(GqlAuthGuard)
	async quizzes(
		@Args("filter", { nullable: true })
		filter: QuizFilterInput = { page: 1, pageSize: 10 },
	) {
		return this.quizzesService.getQuizzes(filter);
	}

	@Query(() => QuizListResult)
	@UseGuards(GqlAuthGuard)
	async myQuizzes(
		@CurrentUser() user: any,
		@Args("filter", { nullable: true })
		filter: QuizFilterInput = { page: 1, pageSize: 10 },
	) {
		return this.quizzesService.getMyQuizzes(user.id, filter);
	}

	// ========== Quiz Mutations ==========

	@Mutation(() => OnlineQuiz)
	@UseGuards(GqlAuthGuard)
	async createQuiz(
		@CurrentUser() user: any,
		@Args("input") input: CreateQuizInput,
	) {
		return this.quizzesService.createQuiz(user.id, input);
	}

	@Mutation(() => OnlineQuiz)
	@UseGuards(GqlAuthGuard)
	async updateQuiz(
		@CurrentUser() user: any,
		@Args("id") id: string,
		@Args("input") input: UpdateQuizInput,
	) {
		return this.quizzesService.updateQuiz(id, user.id, input);
	}

	@Mutation(() => Boolean)
	@UseGuards(GqlAuthGuard)
	async deleteQuiz(@CurrentUser() user: any, @Args("id") id: string) {
		return this.quizzesService.deleteQuiz(id, user.id);
	}

	@Mutation(() => OnlineQuiz)
	@UseGuards(GqlAuthGuard)
	async publishQuiz(@CurrentUser() user: any, @Args("id") id: string) {
		return this.quizzesService.publishQuiz(id, user.id);
	}

	@Mutation(() => OnlineQuiz)
	@UseGuards(GqlAuthGuard)
	async closeQuiz(@CurrentUser() user: any, @Args("id") id: string) {
		return this.quizzesService.closeQuiz(id, user.id);
	}

	// ========== Question Mutations ==========

	@Mutation(() => QuizQuestion)
	@UseGuards(GqlAuthGuard)
	async addQuizQuestion(
		@CurrentUser() user: any,
		@Args("input") input: CreateQuizQuestionInput,
	) {
		return this.quizzesService.addQuestion(user.id, input);
	}

	@Mutation(() => QuizQuestion)
	@UseGuards(GqlAuthGuard)
	async updateQuizQuestion(
		@CurrentUser() user: any,
		@Args("id") id: string,
		@Args("input") input: UpdateQuizQuestionInput,
	) {
		return this.quizzesService.updateQuestion(id, user.id, input);
	}

	@Mutation(() => Boolean)
	@UseGuards(GqlAuthGuard)
	async deleteQuestion(@CurrentUser() user: any, @Args("id") id: string) {
		return this.quizzesService.deleteQuestion(id, user.id);
	}

	@Mutation(() => Boolean)
	@UseGuards(GqlAuthGuard)
	async reorderQuestions(
		@CurrentUser() user: any,
		@Args("quizId") quizId: string,
		@Args({ name: "questionIds", type: () => [String] }) questionIds: string[],
	) {
		return this.quizzesService.reorderQuestions(quizId, user.id, questionIds);
	}

	// ========== Attempt Queries ==========

	@Query(() => QuizAttempt)
	@UseGuards(GqlAuthGuard)
	async attempt(@CurrentUser() user: any, @Args("id") id: string) {
		return this.quizzesService.getAttempt(id, user.id);
	}

	@Query(() => [QuizAttempt])
	@UseGuards(GqlAuthGuard)
	async myAttempts(
		@CurrentUser() user: any,
		@Args("quizId", { nullable: true }) quizId?: string,
	) {
		return this.quizzesService.getMyAttempts(user.id, quizId);
	}

	@Query(() => [QuizAttempt])
	@UseGuards(GqlAuthGuard)
	async quizAttempts(@CurrentUser() user: any, @Args("quizId") quizId: string) {
		return this.quizzesService.getQuizAttempts(quizId, user.id);
	}

	// ========== Attempt Mutations ==========

	@Mutation(() => QuizAttempt)
	@UseGuards(GqlAuthGuard)
	async startAttempt(
		@CurrentUser() user: any,
		@Args("input") input: StartAttemptInput,
	) {
		return this.quizzesService.startAttempt(user.id, input);
	}

	@Mutation(() => QuizResponse)
	@UseGuards(GqlAuthGuard)
	async submitResponse(
		@CurrentUser() user: any,
		@Args("input") input: SubmitResponseInput,
	) {
		return this.quizzesService.submitResponse(user.id, input);
	}

	@Mutation(() => QuizAttempt)
	@UseGuards(GqlAuthGuard)
	async submitAttempt(
		@CurrentUser() user: any,
		@Args("input") input: SubmitAttemptInput,
	) {
		return this.quizzesService.submitAttempt(user.id, input);
	}

	@Mutation(() => QuizAttempt)
	@UseGuards(GqlAuthGuard)
	async gradeAttempt(
		@CurrentUser() user: any,
		@Args("input") input: GradeAttemptInput,
	) {
		return this.quizzesService.gradeAttempt(user.id, input);
	}

	// ========== Statistics ==========

	@Query(() => QuizStats)
	@UseGuards(GqlAuthGuard)
	async quizStats(@CurrentUser() user: any, @Args("quizId") quizId: string) {
		return this.quizzesService.getQuizStats(quizId, user.id);
	}
}
