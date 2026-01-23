import { InputType, Field, Float, ID } from "@nestjs/graphql";

@InputType()
export class CreateExpectedResponseInput {
	@Field(() => ID)
	examPaperId: string;

	@Field(() => ID)
	questionId: string;

	@Field()
	expectedAnswer: string;

	@Field({ nullable: true })
	markingScheme?: string;

	@Field({ nullable: true })
	keywords?: string;

	@Field({ nullable: true })
	alternativeAnswers?: string;
}

@InputType()
export class UpdateExpectedResponseInput {
	@Field(() => ID)
	id: string;

	@Field({ nullable: true })
	expectedAnswer?: string;

	@Field({ nullable: true })
	markingScheme?: string;

	@Field({ nullable: true })
	keywords?: string;

	@Field({ nullable: true })
	alternativeAnswers?: string;
}

@InputType()
export class BulkExpectedResponseInput {
	@Field(() => ID)
	examPaperId: string;

	@Field(() => [ExpectedResponseItem])
	responses: ExpectedResponseItem[];
}

@InputType()
export class ExpectedResponseItem {
	@Field(() => ID)
	questionId: string;

	@Field()
	expectedAnswer: string;

	@Field({ nullable: true })
	markingScheme?: string;

	@Field({ nullable: true })
	keywords?: string;

	@Field({ nullable: true })
	alternativeAnswers?: string;
}

@InputType()
export class RequestAIProposalInput {
	@Field(() => ID)
	examPaperId: string;

	@Field({ nullable: true, defaultValue: "academic" })
	style?: string; // 'academic', 'concise', 'detailed'
}

@InputType()
export class AcceptAIResponsesInput {
	@Field(() => ID)
	examPaperId: string;

	@Field(() => [ID], { nullable: true })
	questionIds?: string[]; // If empty, accept all
}
