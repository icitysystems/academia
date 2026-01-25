import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";

/**
 * User Role enum as per Specification Section 2A
 * Must match roles used in Prisma schema and frontend
 */
export enum UserRoleEnum {
	STUDENT = "STUDENT",
	FACULTY = "FACULTY",
	TEACHER = "TEACHER", // Alias for FACULTY (used in lesson tracking)
	ADMIN = "ADMIN",
	SUPPORT_STAFF = "SUPPORT_STAFF",
	PARENT = "PARENT",
	ALUMNI = "ALUMNI",
	GUEST = "GUEST",
}

registerEnumType(UserRoleEnum, {
	name: "UserRole",
	description:
		"User roles in the system - STUDENT, FACULTY, TEACHER, ADMIN, SUPPORT_STAFF, PARENT, ALUMNI, GUEST",
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
