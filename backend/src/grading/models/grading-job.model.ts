import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { MLModel } from "../../ml/models/ml-model.model";
import { Template } from "../../templates/models/template.model";

@ObjectType()
export class GradingJobCounts {
	@Field(() => Int)
	results: number;
}

@ObjectType()
export class GradingJob {
	@Field(() => ID)
	id: string;

	@Field()
	templateId: string;

	@Field()
	modelId: string;

	@Field()
	teacherId: string;

	@Field(() => String)
	status: string;

	@Field(() => Int)
	totalSheets: number;

	@Field(() => Int)
	processedSheets: number;

	@Field({ nullable: true })
	errorMessage?: string;

	@Field({ nullable: true })
	startedAt?: Date;

	@Field({ nullable: true })
	completedAt?: Date;

	@Field()
	createdAt: Date;

	@Field(() => MLModel, { nullable: true })
	model?: MLModel;

	@Field(() => Template, { nullable: true })
	template?: Template;

	@Field(() => GradingJobCounts, { nullable: true })
	_count?: GradingJobCounts;
}
