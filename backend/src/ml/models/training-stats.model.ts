import { ObjectType, Field, Int } from "@nestjs/graphql";
import { MLModel } from "./ml-model.model";
import { TrainingSession } from "./training-session.model";

@ObjectType()
export class TrainingStats {
	@Field(() => Int)
	totalSessions: number;

	@Field(() => Int)
	completedSessions: number;

	@Field(() => Int)
	trainingAnnotations: number;

	@Field(() => MLModel, { nullable: true })
	activeModel?: MLModel;

	@Field(() => [TrainingSession])
	recentSessions: TrainingSession[];
}
