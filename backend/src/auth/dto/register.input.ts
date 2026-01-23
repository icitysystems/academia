import { InputType, Field } from "@nestjs/graphql";
import {
	IsEmail,
	IsString,
	MinLength,
	IsOptional,
	IsIn,
} from "class-validator";
import { UserRoleEnum } from "../models/user.model";

@InputType()
export class RegisterInput {
	@Field()
	@IsEmail()
	email: string;

	@Field()
	@IsString()
	@MinLength(8)
	password: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	name?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsIn(["TEACHER", "ADMIN"])
	role?: string;
}
