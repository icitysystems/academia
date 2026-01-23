import { Resolver, Query, Mutation, Args, Context } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AssignmentsService } from "./assignments.service";
import {
	Assignment,
	AssignmentSubmission,
	AssignmentStats,
} from "./models/assignment.model";
import {
	CreateAssignmentInput,
	UpdateAssignmentInput,
	SubmitAssignmentInput,
	GradeSubmissionInput,
	AssignmentFilterInput,
} from "./dto/assignment.dto";
import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType()
export class AssignmentListResult {
	@Field(() => [Assignment])
	assignments: Assignment[];

	@Field(() => Int)
	total: number;

	@Field(() => Int)
	page: number;

	@Field(() => Int)
	pageSize: number;
}

@Resolver(() => Assignment)
export class AssignmentsResolver {
	constructor(private assignmentsService: AssignmentsService) {}

	// ========== Assignment Queries ==========

	@Query(() => Assignment)
	@UseGuards(GqlAuthGuard)
	async assignment(@Args("id") id: string) {
		return this.assignmentsService.getAssignment(id);
	}

	@Query(() => AssignmentListResult)
	@UseGuards(GqlAuthGuard)
	async assignments(
		@Args("filter", { nullable: true })
		filter: AssignmentFilterInput = { page: 1, pageSize: 10 },
	) {
		return this.assignmentsService.getAssignments(filter);
	}

	@Query(() => [Assignment])
	@UseGuards(GqlAuthGuard)
	async myAssignments(@CurrentUser() user: any) {
		return this.assignmentsService.getCreatorAssignments(user.id);
	}

	// ========== Assignment Mutations ==========

	@Mutation(() => Assignment)
	@UseGuards(GqlAuthGuard)
	async createAssignment(
		@CurrentUser() user: any,
		@Args("input") input: CreateAssignmentInput,
	) {
		return this.assignmentsService.createAssignment(user.id, input);
	}

	@Mutation(() => Assignment)
	@UseGuards(GqlAuthGuard)
	async updateAssignment(
		@CurrentUser() user: any,
		@Args("id") id: string,
		@Args("input") input: UpdateAssignmentInput,
	) {
		return this.assignmentsService.updateAssignment(id, user.id, input);
	}

	@Mutation(() => Boolean)
	@UseGuards(GqlAuthGuard)
	async deleteAssignment(@CurrentUser() user: any, @Args("id") id: string) {
		return this.assignmentsService.deleteAssignment(id, user.id);
	}

	@Mutation(() => Assignment)
	@UseGuards(GqlAuthGuard)
	async publishAssignment(@CurrentUser() user: any, @Args("id") id: string) {
		return this.assignmentsService.publishAssignment(id, user.id);
	}

	@Mutation(() => Assignment)
	@UseGuards(GqlAuthGuard)
	async closeAssignment(@CurrentUser() user: any, @Args("id") id: string) {
		return this.assignmentsService.closeAssignment(id, user.id);
	}

	// ========== Submission Queries ==========

	@Query(() => AssignmentSubmission)
	@UseGuards(GqlAuthGuard)
	async submission(@CurrentUser() user: any, @Args("id") id: string) {
		return this.assignmentsService.getSubmission(id, user.id);
	}

	@Query(() => [AssignmentSubmission])
	@UseGuards(GqlAuthGuard)
	async assignmentSubmissions(
		@CurrentUser() user: any,
		@Args("assignmentId") assignmentId: string,
	) {
		return this.assignmentsService.getAssignmentSubmissions(
			assignmentId,
			user.id,
		);
	}

	@Query(() => [AssignmentSubmission])
	@UseGuards(GqlAuthGuard)
	async mySubmissions(@CurrentUser() user: any) {
		return this.assignmentsService.getStudentSubmissions(user.id);
	}

	// ========== Submission Mutations ==========

	@Mutation(() => AssignmentSubmission)
	@UseGuards(GqlAuthGuard)
	async submitAssignment(
		@CurrentUser() user: any,
		@Args("input") input: SubmitAssignmentInput,
	) {
		return this.assignmentsService.submitAssignment(user.id, input);
	}

	@Mutation(() => AssignmentSubmission)
	@UseGuards(GqlAuthGuard)
	async gradeSubmission(
		@CurrentUser() user: any,
		@Args("input") input: GradeSubmissionInput,
	) {
		return this.assignmentsService.gradeSubmission(user.id, input);
	}

	@Mutation(() => AssignmentSubmission)
	@UseGuards(GqlAuthGuard)
	async returnSubmission(@CurrentUser() user: any, @Args("id") id: string) {
		return this.assignmentsService.returnSubmission(id, user.id);
	}

	// ========== Statistics ==========

	@Query(() => AssignmentStats)
	@UseGuards(GqlAuthGuard)
	async assignmentStats(
		@CurrentUser() user: any,
		@Args("assignmentId") assignmentId: string,
	) {
		return this.assignmentsService.getAssignmentStats(assignmentId, user.id);
	}
}
