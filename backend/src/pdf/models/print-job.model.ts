import { ObjectType, Field, ID, Int, registerEnumType } from "@nestjs/graphql";
import { PDFOutput } from "./pdf-output.model";

// Define PrintStatus enum for GraphQL
export enum PrintStatusEnum {
	QUEUED = "QUEUED",
	PRINTING = "PRINTING",
	PRINTED = "PRINTED",
	FAILED = "FAILED",
	CANCELLED = "CANCELLED",
}

registerEnumType(PrintStatusEnum, {
	name: "PrintStatus",
	description: "Status of a print job",
});

@ObjectType()
export class PrintJob {
	@Field(() => ID)
	id: string;

	@Field()
	pdfId: string;

	@Field({ nullable: true })
	printerName?: string;

	@Field(() => String)
	status: string;

	@Field(() => Int)
	copies: number;

	@Field({ nullable: true })
	errorMessage?: string;

	@Field()
	queuedAt: Date;

	@Field({ nullable: true })
	printedAt?: Date;

	@Field(() => PDFOutput, { nullable: true })
	pdf?: PDFOutput;
}
