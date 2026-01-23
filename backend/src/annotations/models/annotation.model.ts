import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { QuestionLabel } from "./question-label.model";
import { User } from "../../auth/models/user.model";

// Define Correctness enum for GraphQL
export enum CorrectnessEnum {
	CORRECT = "CORRECT",
	PARTIAL = "PARTIAL",
	INCORRECT = "INCORRECT",
	SKIPPED = "SKIPPED",
}

registerEnumType(CorrectnessEnum, {
	name: "Correctness",
	description: "Correctness status for a question",
});

@ObjectType()
export class Annotation {
	@Field(() => ID)
	id: string;

	@Field()
	sheetId: string;

	@Field()
	templateId: string;

	@Field()
	teacherId: string;

	@Field(() => GraphQLJSON, { nullable: true })
	strokes?: any;

	@Field({ nullable: true })
	comments?: string;

	@Field()
	isTrainingData: boolean;

	@Field(() => [QuestionLabel])
	questionLabels: QuestionLabel[];

	@Field(() => User, { nullable: true })
	teacher?: User;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}
