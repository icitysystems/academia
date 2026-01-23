import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { AnnotationsService } from "./annotations.service";
import { Annotation } from "./models/annotation.model";
import { AnnotationStats } from "./models/annotation-stats.model";
import { CreateAnnotationInput } from "./dto/create-annotation.input";
import { UpdateAnnotationInput } from "./dto/update-annotation.input";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Resolver(() => Annotation)
@UseGuards(GqlAuthGuard)
export class AnnotationsResolver {
	constructor(private annotationsService: AnnotationsService) {}

	@Mutation(() => Annotation)
	async createAnnotation(
		@Args("input") input: CreateAnnotationInput,
		@CurrentUser() user: any,
	) {
		return this.annotationsService.create(input, user.sub);
	}

	@Query(() => [Annotation])
	async annotations(
		@CurrentUser() user: any,
		@Args("templateId", { type: () => ID, nullable: true }) templateId?: string,
	) {
		return this.annotationsService.findAll(user.sub, templateId);
	}

	@Query(() => Annotation)
	async annotation(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.annotationsService.findOne(id, user.sub);
	}

	@Query(() => [Annotation])
	async sheetAnnotations(
		@Args("sheetId", { type: () => ID }) sheetId: string,
		@CurrentUser() user: any,
	) {
		return this.annotationsService.findBySheet(sheetId, user.sub);
	}

	@Mutation(() => Annotation)
	async updateAnnotation(
		@Args("id", { type: () => ID }) id: string,
		@Args("input") input: UpdateAnnotationInput,
		@CurrentUser() user: any,
	) {
		return this.annotationsService.update(id, input, user.sub);
	}

	@Mutation(() => Annotation)
	async deleteAnnotation(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.annotationsService.delete(id, user.sub);
	}

	@Query(() => [Annotation])
	async trainingData(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.annotationsService.getTrainingData(templateId, user.sub);
	}

	@Query(() => AnnotationStats)
	async annotationStats(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.annotationsService.getAnnotationStats(templateId, user.sub);
	}
}
