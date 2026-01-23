import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";

// Define UserRole enum for GraphQL
export enum UserRoleEnum {
	TEACHER = "TEACHER",
	ADMIN = "ADMIN",
}

registerEnumType(UserRoleEnum, {
	name: "UserRole",
	description: "User roles in the system",
});

@ObjectType()
export class User {
	@Field(() => ID)
	id: string;

	@Field()
	email: string;

	@Field({ nullable: true })
	name?: string;

	@Field(() => UserRoleEnum)
	role: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}
