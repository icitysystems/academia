import { ObjectType, Field } from "@nestjs/graphql";

@ObjectType()
export class PasswordResetResponse {
	@Field()
	success: boolean;

	@Field()
	message: string;
}

@ObjectType()
export class EmailVerificationResponse {
	@Field()
	success: boolean;

	@Field()
	message: string;

	@Field({ nullable: true })
	email?: string;
}
