import {
	Resolver,
	Query,
	Mutation,
	Subscription,
	Args,
	Context,
} from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import {
	RealTimeCollaborationService,
	CollaborationEvent,
	CursorPosition,
	SelectionRange,
} from "./realtime-collaboration.service";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import {
	ObjectType,
	Field,
	ID,
	InputType,
	Int,
	registerEnumType,
} from "@nestjs/graphql";

// GraphQL Types
enum OperationTypeEnum {
	INSERT = "insert",
	DELETE = "delete",
	RETAIN = "retain",
	REPLACE = "replace",
}

registerEnumType(OperationTypeEnum, {
	name: "OperationType",
	description: "Types of collaborative editing operations",
});

@ObjectType()
class CursorPositionType {
	@Field(() => Int)
	line: number;

	@Field(() => Int)
	column: number;

	@Field(() => Int)
	offset: number;
}

@ObjectType()
class SelectionRangeType {
	@Field(() => CursorPositionType)
	start: CursorPositionType;

	@Field(() => CursorPositionType)
	end: CursorPositionType;
}

@ObjectType()
class ParticipantType {
	@Field(() => ID)
	id: string;

	@Field()
	name: string;

	@Field()
	color: string;

	@Field(() => CursorPositionType, { nullable: true })
	cursor?: CursorPositionType;

	@Field(() => SelectionRangeType, { nullable: true })
	selection?: SelectionRangeType;

	@Field()
	isActive: boolean;
}

@ObjectType()
class OperationType {
	@Field(() => OperationTypeEnum)
	type: OperationTypeEnum;

	@Field(() => Int)
	position: number;

	@Field({ nullable: true })
	content?: string;

	@Field(() => Int, { nullable: true })
	length?: number;

	@Field()
	userId: string;

	@Field()
	timestamp: number;

	@Field(() => Int)
	version: number;
}

@ObjectType()
class CollaborationSessionType {
	@Field(() => ID)
	id: string;

	@Field()
	documentId: string;

	@Field()
	documentType: string;

	@Field()
	content: string;

	@Field(() => Int)
	version: number;

	@Field(() => [ParticipantType])
	participants: ParticipantType[];
}

@ObjectType()
class JoinSessionResponse {
	@Field(() => CollaborationSessionType)
	session: CollaborationSessionType;

	@Field(() => ParticipantType)
	participant: ParticipantType;
}

@ObjectType()
class ApplyOperationResponse {
	@Field(() => OperationType)
	applied: OperationType;

	@Field()
	content: string;

	@Field(() => Int)
	version: number;
}

@ObjectType()
class SyncResponse {
	@Field(() => [OperationType])
	operations: OperationType[];

	@Field()
	content: string;

	@Field(() => Int)
	version: number;
}

@ObjectType()
class PresenceType {
	@Field()
	userId: string;

	@Field()
	userName: string;

	@Field()
	color: string;

	@Field(() => CursorPositionType, { nullable: true })
	cursor?: CursorPositionType;

	@Field(() => SelectionRangeType, { nullable: true })
	selection?: SelectionRangeType;

	@Field()
	isTyping: boolean;
}

@ObjectType()
class CollaborationEventType {
	@Field()
	type: string;

	@Field()
	sessionId: string;

	@Field()
	userId: string;

	@Field()
	data: string; // JSON stringified data

	@Field()
	timestamp: number;
}

// Input Types
@InputType()
class CursorPositionInput {
	@Field(() => Int)
	line: number;

	@Field(() => Int)
	column: number;

	@Field(() => Int)
	offset: number;
}

@InputType()
class SelectionRangeInput {
	@Field(() => CursorPositionInput)
	start: CursorPositionInput;

	@Field(() => CursorPositionInput)
	end: CursorPositionInput;
}

@InputType()
class OperationInput {
	@Field(() => OperationTypeEnum)
	type: OperationTypeEnum;

	@Field(() => Int)
	position: number;

	@Field({ nullable: true })
	content?: string;

	@Field(() => Int, { nullable: true })
	length?: number;
}

@Resolver()
export class RealTimeCollaborationResolver {
	constructor(
		private readonly collaborationService: RealTimeCollaborationService,
	) {}

	@Query(() => CollaborationSessionType, { nullable: true })
	@UseGuards(GqlAuthGuard)
	async getCollaborationSession(
		@Args("sessionId") sessionId: string,
	): Promise<CollaborationSessionType | null> {
		const state = this.collaborationService.getSessionState(sessionId);
		if (!state) return null;

		return {
			id: sessionId,
			documentId: sessionId.split(":")[1],
			documentType: sessionId.split(":")[0],
			content: state.content,
			version: state.version,
			participants: state.participants,
		};
	}

	@Query(() => [PresenceType])
	@UseGuards(GqlAuthGuard)
	async getPresence(
		@Args("sessionId") sessionId: string,
	): Promise<PresenceType[]> {
		return this.collaborationService.getPresence(sessionId);
	}

	@Query(() => [String])
	@UseGuards(GqlAuthGuard)
	async getUserActiveSessions(@Context() ctx: any): Promise<string[]> {
		const userId = ctx.req.user.id;
		return this.collaborationService.getUserSessions(userId);
	}

	@Mutation(() => JoinSessionResponse)
	@UseGuards(GqlAuthGuard)
	async joinCollaborationSession(
		@Args("documentId") documentId: string,
		@Args("documentType") documentType: string,
		@Context() ctx: any,
	): Promise<JoinSessionResponse> {
		const userId = ctx.req.user.id;
		const docType = documentType as
			| "lesson_plan"
			| "assignment"
			| "document"
			| "note";

		const result = await this.collaborationService.joinSession(
			documentId,
			docType,
			userId,
		);

		return {
			session: {
				id: result.session.id,
				documentId: result.session.documentId,
				documentType: result.session.documentType,
				content: result.session.content,
				version: result.session.currentVersion,
				participants: Array.from(result.session.participants.values()),
			},
			participant: result.participant,
		};
	}

	@Mutation(() => Boolean)
	@UseGuards(GqlAuthGuard)
	async leaveCollaborationSession(
		@Args("sessionId") sessionId: string,
		@Context() ctx: any,
	): Promise<boolean> {
		const userId = ctx.req.user.id;
		await this.collaborationService.leaveSession(sessionId, userId);
		return true;
	}

	@Mutation(() => ApplyOperationResponse)
	@UseGuards(GqlAuthGuard)
	async applyCollaborationOperation(
		@Args("sessionId") sessionId: string,
		@Args("operation") operation: OperationInput,
		@Context() ctx: any,
	): Promise<ApplyOperationResponse> {
		const userId = ctx.req.user.id;
		const result = await this.collaborationService.applyOperation(
			sessionId,
			userId,
			{
				type: operation.type as any,
				position: operation.position,
				content: operation.content,
				length: operation.length,
			},
		);
		// Map string type to enum
		return {
			...result,
			applied: {
				...result.applied,
				type: result.applied.type as unknown as OperationTypeEnum,
			},
		};
	}

	@Mutation(() => Boolean)
	@UseGuards(GqlAuthGuard)
	async updateCollaborationCursor(
		@Args("sessionId") sessionId: string,
		@Args("cursor") cursor: CursorPositionInput,
		@Context() ctx: any,
	): Promise<boolean> {
		const userId = ctx.req.user.id;
		await this.collaborationService.updateCursor(sessionId, userId, cursor);
		return true;
	}

	@Mutation(() => Boolean)
	@UseGuards(GqlAuthGuard)
	async updateCollaborationSelection(
		@Args("sessionId") sessionId: string,
		@Args("selection", { nullable: true })
		selection: SelectionRangeInput | null,
		@Context() ctx: any,
	): Promise<boolean> {
		const userId = ctx.req.user.id;
		await this.collaborationService.updateSelection(
			sessionId,
			userId,
			selection,
		);
		return true;
	}

	@Mutation(() => SyncResponse)
	@UseGuards(GqlAuthGuard)
	async requestCollaborationSync(
		@Args("sessionId") sessionId: string,
		@Args("clientVersion", { type: () => Int }) clientVersion: number,
		@Context() ctx: any,
	): Promise<SyncResponse> {
		const userId = ctx.req.user.id;
		const result = await this.collaborationService.requestSync(
			sessionId,
			userId,
			clientVersion,
		);
		// Map string types to enums
		return {
			...result,
			operations: result.operations.map((op) => ({
				...op,
				type: op.type as unknown as OperationTypeEnum,
			})),
		};
	}

	@Subscription(() => CollaborationEventType, {
		filter: (payload, variables) => {
			return payload.collaborationEvent.sessionId === variables.sessionId;
		},
		resolve: (payload) => ({
			...payload.collaborationEvent,
			data: JSON.stringify(payload.collaborationEvent.data),
		}),
	})
	collaborationEvents(@Args("sessionId") sessionId: string) {
		return this.collaborationService.subscribeToSession(sessionId);
	}
}
