import { ObjectType, Field, ID, Float } from "@nestjs/graphql";
import { TemplateRegion } from "../../templates/models/template-region.model";

@ObjectType()
export class QuestionLabel {
	@Field(() => ID)
	id: string;

	@Field()
	annotationId: string;

	@Field()
	regionId: string;

	@Field(() => String)
	correctness: string;

	@Field(() => Float)
	score: number;

	@Field(() => Float, { nullable: true })
	confidence?: number;

	@Field({ nullable: true })
	comment?: string;

	@Field(() => TemplateRegion, { nullable: true })
	region?: TemplateRegion;

	@Field()
	createdAt: Date;
}
