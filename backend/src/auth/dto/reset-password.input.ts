import { InputType, Field } from "@nestjs/graphql";
import { IsNotEmpty, MinLength, IsString } from "class-validator";

@InputType()
export class ResetPasswordInput {
	@Field()
	@IsString()
	@IsNotEmpty()
	token: string;

	@Field()
	@IsString()
	@MinLength(8, { message: "Password must be at least 8 characters" })
	newPassword: string;
}
