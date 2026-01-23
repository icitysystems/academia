import { InputType, Field } from "@nestjs/graphql";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

@InputType()
export class SubscribeNewsletterInput {
	@Field()
	@IsEmail()
	email: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	name?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	source?: string;
}

@InputType()
export class UnsubscribeNewsletterInput {
	@Field()
	@IsEmail()
	email: string;
}
