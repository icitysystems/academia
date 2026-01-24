import { InputType, Field, Int } from "@nestjs/graphql";

@InputType()
export class AuditLogOptionsInput {
	@Field({ nullable: true })
	userId?: string;

	@Field({ nullable: true })
	action?: string;

	@Field({ nullable: true })
	entityType?: string;

	@Field({ nullable: true })
	startDate?: string;

	@Field({ nullable: true })
	endDate?: string;

	@Field(() => Int, { nullable: true, defaultValue: 50 })
	limit?: number;

	@Field(() => Int, { nullable: true, defaultValue: 0 })
	offset?: number;
}
