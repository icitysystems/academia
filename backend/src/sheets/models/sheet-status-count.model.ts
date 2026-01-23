import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType()
export class SheetStatusCount {
	@Field()
	status: string;

	@Field(() => Int)
	count: number;
}
