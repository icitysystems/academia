import { InputType, Field, PartialType } from "@nestjs/graphql";
import { CreateTemplateInput } from "./create-template.input";

@InputType()
export class UpdateTemplateInput extends PartialType(CreateTemplateInput) {}
