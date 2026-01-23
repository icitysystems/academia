import { ObjectType, Field } from "@nestjs/graphql";
import { User } from "../models/user.model";

@ObjectType()
export class AuthResponse {
	@Field(() => User)
	user: User;

	@Field()
	token: string;
}
