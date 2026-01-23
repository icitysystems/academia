import { ObjectType, Field, ID, Float } from "@nestjs/graphql";

@ObjectType()
export class ExpectedResponse {
	@Field(() => ID)
	id: string;

	@Field()
	examPaperId: string;

	@Field()
	questionId: string;

	@Field()
	expectedAnswer: string;

	@Field({ nullable: true })
	markingScheme?: string;

	@Field({ nullable: true })
	keywords?: string;

	@Field()
	isAIGenerated: boolean;

	@Field({ nullable: true })
	alternativeAnswers?: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@ObjectType()
export class AIProposedResponse {
	@Field()
	questionId: string;

	@Field(() => Float)
	questionNumber: number;

	@Field()
	questionText: string;

	@Field()
	proposedAnswer: string;

	@Field({ nullable: true })
	suggestedKeywords?: string;

	@Field({ nullable: true })
	markingScheme?: string;

	@Field(() => Float)
	confidence: number;
}

@ObjectType()
export class ProposedResponses {
	@Field()
	examPaperId: string;

	@Field(() => [AIProposedResponse])
	responses: AIProposedResponse[];
}
