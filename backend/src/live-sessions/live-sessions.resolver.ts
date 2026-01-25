import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { UseGuards } from "@nestjs/common";
import { LiveSessionsService } from "./live-sessions.service";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class LiveSessionsResolver {
	constructor(private liveSessionsService: LiveSessionsService) {}

	// ========== Queries ==========

	@Query(() => GraphQLJSON, { name: "liveSession" })
	async getSession(@Args("sessionId", { type: () => ID }) sessionId: string) {
		return this.liveSessionsService.getSession(sessionId);
	}

	@Query(() => [GraphQLJSON], { name: "upcomingLiveSessions" })
	async getUpcomingSessions(@CurrentUser() user: any) {
		return this.liveSessionsService.getUpcomingSessions(user.sub);
	}

	@Query(() => GraphQLJSON, { name: "myHostedSessions" })
	async getHostedSessions(
		@CurrentUser() user: any,
		@Args("skip", { type: () => Int, nullable: true }) skip?: number,
		@Args("take", { type: () => Int, nullable: true }) take?: number,
		@Args("status", { nullable: true }) status?: string,
	) {
		return this.liveSessionsService.getHostedSessions(user.sub, {
			skip,
			take,
			status,
		});
	}

	@Query(() => [GraphQLJSON], { name: "sessionParticipants" })
	async getSessionParticipants(
		@Args("sessionId", { type: () => ID }) sessionId: string,
	) {
		return this.liveSessionsService.getSessionParticipants(sessionId);
	}

	@Query(() => GraphQLJSON, { name: "roomCredentials" })
	async getRoomCredentials(
		@Args("sessionId", { type: () => ID }) sessionId: string,
		@CurrentUser() user: any,
	) {
		return this.liveSessionsService.getRoomCredentials(sessionId, user.sub);
	}

	// ========== Mutations ==========

	@Mutation(() => GraphQLJSON, { name: "createLiveSession" })
	@Roles("FACULTY", "ADMIN")
	async createSession(
		@CurrentUser() user: any,
		@Args("title") title: string,
		@Args("scheduledStart", { type: () => Date }) scheduledStart: Date,
		@Args("courseId", { type: () => ID, nullable: true }) courseId?: string,
		@Args("description", { nullable: true }) description?: string,
		@Args("sessionType", { nullable: true }) sessionType?: string,
		@Args("scheduledEnd", { type: () => Date, nullable: true })
		scheduledEnd?: Date,
		@Args("maxParticipants", { type: () => Int, nullable: true })
		maxParticipants?: number,
		@Args("isRecorded", { nullable: true }) isRecorded?: boolean,
		@Args("password", { nullable: true }) password?: string,
	) {
		return this.liveSessionsService.createSession(user.sub, {
			courseId,
			title,
			description,
			sessionType,
			scheduledStart,
			scheduledEnd,
			maxParticipants,
			isRecorded,
			password,
		});
	}

	@Mutation(() => GraphQLJSON, { name: "updateLiveSession" })
	async updateSession(
		@Args("sessionId", { type: () => ID }) sessionId: string,
		@CurrentUser() user: any,
		@Args("title", { nullable: true }) title?: string,
		@Args("description", { nullable: true }) description?: string,
		@Args("scheduledStart", { type: () => Date, nullable: true })
		scheduledStart?: Date,
		@Args("scheduledEnd", { type: () => Date, nullable: true })
		scheduledEnd?: Date,
		@Args("maxParticipants", { type: () => Int, nullable: true })
		maxParticipants?: number,
		@Args("isRecorded", { nullable: true }) isRecorded?: boolean,
		@Args("password", { nullable: true }) password?: string,
	) {
		return this.liveSessionsService.updateSession(sessionId, user.sub, {
			title,
			description,
			scheduledStart,
			scheduledEnd,
			maxParticipants,
			isRecorded,
			password,
		});
	}

	@Mutation(() => GraphQLJSON, { name: "startLiveSession" })
	async startSession(
		@Args("sessionId", { type: () => ID }) sessionId: string,
		@CurrentUser() user: any,
	) {
		return this.liveSessionsService.startSession(sessionId, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "endLiveSession" })
	async endSession(
		@Args("sessionId", { type: () => ID }) sessionId: string,
		@CurrentUser() user: any,
		@Args("recordingUrl", { nullable: true }) recordingUrl?: string,
	) {
		return this.liveSessionsService.endSession(
			sessionId,
			user.sub,
			recordingUrl,
		);
	}

	@Mutation(() => GraphQLJSON, { name: "cancelLiveSession" })
	async cancelSession(
		@Args("sessionId", { type: () => ID }) sessionId: string,
		@CurrentUser() user: any,
	) {
		return this.liveSessionsService.cancelSession(sessionId, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "joinLiveSession" })
	async joinSession(
		@Args("sessionId", { type: () => ID }) sessionId: string,
		@CurrentUser() user: any,
	) {
		return this.liveSessionsService.joinSession(sessionId, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "leaveLiveSession" })
	async leaveSession(
		@Args("sessionId", { type: () => ID }) sessionId: string,
		@CurrentUser() user: any,
	) {
		return this.liveSessionsService.leaveSession(sessionId, user.sub);
	}
}
