import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql"
import { GraphQLJSON } from 'graphql-type-json';
import { UseGuards } from "@nestjs/common";
import { DiscussionsService } from "./discussions.service";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

/**
 * Discussion Forums Resolver
 * Implements GraphQL endpoints for discussion features as per Specification Section 2A.1
 *
 * Enables:
 * - Students to participate in discussion forums
 * - Communication with instructors and peers
 * - Q&A functionality with answer marking
 */
@Resolver()
@UseGuards(GqlAuthGuard)
export class DiscussionsResolver {
	constructor(private discussionsService: DiscussionsService) {}

	// ============================
	// Thread Queries
	// ============================

	@Query(() => GraphQLJSON, { name: "discussionThread" })
	async getThread(
		@Args("threadId", { type: () => ID }) threadId: string,
		@CurrentUser() user: any,
	) {
		return this.discussionsService.getThread(threadId, user.sub);
	}

	@Query(() => GraphQLJSON, { name: "courseDiscussions" })
	async getCourseThreads(
		@Args("courseId", { type: () => ID }) courseId: string,
		@CurrentUser() user: any,
		@Args("search", { nullable: true }) search?: string,
		@Args("skip", { type: () => Int, nullable: true }) skip?: number,
		@Args("take", { type: () => Int, nullable: true }) take?: number,
	) {
		return this.discussionsService.getCourseThreads(courseId, user.sub, {
			search,
			skip,
			take,
		});
	}

	@Query(() => GraphQLJSON, { name: "myDiscussionThreads" })
	async getUserThreads(
		@CurrentUser() user: any,
		@Args("skip", { type: () => Int, nullable: true }) skip?: number,
		@Args("take", { type: () => Int, nullable: true }) take?: number,
	) {
		return this.discussionsService.getUserThreads(user.sub, { skip, take });
	}

	@Query(() => GraphQLJSON, { name: "myDiscussionPosts" })
	async getUserPosts(
		@CurrentUser() user: any,
		@Args("skip", { type: () => Int, nullable: true }) skip?: number,
		@Args("take", { type: () => Int, nullable: true }) take?: number,
	) {
		return this.discussionsService.getUserPosts(user.sub, { skip, take });
	}

	@Query(() => GraphQLJSON, { name: "discussionStats" })
	async getDiscussionStats(@CurrentUser() user: any) {
		return this.discussionsService.getUserDiscussionStats(user.sub);
	}

	// ============================
	// Thread Mutations
	// ============================

	@Mutation(() => GraphQLJSON, { name: "createDiscussionThread" })
	async createThread(
		@Args("title") title: string,
		@Args("content") content: string,
		@Args("courseId", { type: () => ID, nullable: true }) courseId: string,
		@Args("classSubjectId", { type: () => ID, nullable: true })
		classSubjectId: string,
		@CurrentUser() user: any,
	) {
		return this.discussionsService.createThread(
			{ title, content, courseId, classSubjectId },
			user.sub,
		);
	}

	@Mutation(() => GraphQLJSON, { name: "updateDiscussionThread" })
	async updateThread(
		@Args("threadId", { type: () => ID }) threadId: string,
		@Args("title", { nullable: true }) title: string,
		@Args("content", { nullable: true }) content: string,
		@CurrentUser() user: any,
	) {
		return this.discussionsService.updateThread(
			threadId,
			{ title, content },
			user.sub,
		);
	}

	@Mutation(() => Boolean, { name: "deleteDiscussionThread" })
	async deleteThread(
		@Args("threadId", { type: () => ID }) threadId: string,
		@CurrentUser() user: any,
	) {
		return this.discussionsService.deleteThread(threadId, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "togglePinThread" })
	async togglePinThread(
		@Args("threadId", { type: () => ID }) threadId: string,
		@CurrentUser() user: any,
	) {
		return this.discussionsService.togglePinThread(threadId, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "toggleLockThread" })
	async toggleLockThread(
		@Args("threadId", { type: () => ID }) threadId: string,
		@CurrentUser() user: any,
	) {
		return this.discussionsService.toggleLockThread(threadId, user.sub);
	}

	// ============================
	// Post Mutations
	// ============================

	@Mutation(() => GraphQLJSON, { name: "createDiscussionPost" })
	async createPost(
		@Args("threadId", { type: () => ID }) threadId: string,
		@Args("content") content: string,
		@Args("parentId", { type: () => ID, nullable: true }) parentId: string,
		@CurrentUser() user: any,
	) {
		return this.discussionsService.createPost(
			{ threadId, content, parentId },
			user.sub,
		);
	}

	@Mutation(() => GraphQLJSON, { name: "updateDiscussionPost" })
	async updatePost(
		@Args("postId", { type: () => ID }) postId: string,
		@Args("content") content: string,
		@CurrentUser() user: any,
	) {
		return this.discussionsService.updatePost(postId, content, user.sub);
	}

	@Mutation(() => Boolean, { name: "deleteDiscussionPost" })
	async deletePost(
		@Args("postId", { type: () => ID }) postId: string,
		@CurrentUser() user: any,
	) {
		return this.discussionsService.deletePost(postId, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "upvotePost" })
	async upvotePost(
		@Args("postId", { type: () => ID }) postId: string,
		@CurrentUser() user: any,
	) {
		return this.discussionsService.upvotePost(postId, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "markPostAsAnswer" })
	async markAsAnswer(
		@Args("postId", { type: () => ID }) postId: string,
		@CurrentUser() user: any,
	) {
		return this.discussionsService.markAsAnswer(postId, user.sub);
	}
}

