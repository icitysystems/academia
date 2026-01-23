import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { Template } from "../../templates/models/template.model";

// Define SheetStatus enum for GraphQL
export enum SheetStatusEnum {
	UPLOADED = "UPLOADED",
	PROCESSING = "PROCESSING",
	PROCESSED = "PROCESSED",
	ANNOTATED = "ANNOTATED",
	GRADED = "GRADED",
	REVIEWED = "REVIEWED",
	ERROR = "ERROR",
}

registerEnumType(SheetStatusEnum, {
	name: "SheetStatus",
	description: "Processing status of an answer sheet",
});

@ObjectType()
export class AnswerSheet {
	@Field(() => ID)
	id: string;

	@Field()
	templateId: string;

	@Field({ nullable: true })
	studentId?: string;

	@Field({ nullable: true })
	studentName?: string;

	@Field()
	originalUrl: string;

	@Field({ nullable: true })
	processedUrl?: string;

	@Field({ nullable: true })
	thumbnailUrl?: string;

	@Field(() => String)
	status: string;

	@Field(() => GraphQLJSON, { nullable: true })
	ocrData?: any;

	@Field(() => Template, { nullable: true })
	template?: Template;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}
