import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { TemplatesService } from "./templates.service";
import { Template } from "./models/template.model";
import { TemplateRegion } from "./models/template-region.model";
import { CreateTemplateInput } from "./dto/create-template.input";
import { UpdateTemplateInput } from "./dto/update-template.input";
import { CreateRegionInput } from "./dto/create-region.input";
import { UpdateRegionInput } from "./dto/update-region.input";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Resolver(() => Template)
@UseGuards(GqlAuthGuard)
export class TemplatesResolver {
	constructor(private templatesService: TemplatesService) {}

	@Mutation(() => Template)
	async createTemplate(
		@Args("input") input: CreateTemplateInput,
		@CurrentUser() user: any,
	) {
		return this.templatesService.create(input, user.sub);
	}

	@Query(() => [Template])
	async templates(@CurrentUser() user: any) {
		return this.templatesService.findAll(user.sub);
	}

	@Query(() => Template)
	async template(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.templatesService.findOne(id, user.sub);
	}

	@Mutation(() => Template)
	async updateTemplate(
		@Args("id", { type: () => ID }) id: string,
		@Args("input") input: UpdateTemplateInput,
		@CurrentUser() user: any,
	) {
		return this.templatesService.update(id, input, user.sub);
	}

	@Mutation(() => Template)
	async deleteTemplate(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.templatesService.delete(id, user.sub);
	}

	// Region mutations
	@Mutation(() => TemplateRegion)
	async addTemplateRegion(
		@Args("templateId", { type: () => ID }) templateId: string,
		@Args("input") input: CreateRegionInput,
		@CurrentUser() user: any,
	) {
		return this.templatesService.addRegion(templateId, input, user.sub);
	}

	@Mutation(() => TemplateRegion)
	async updateTemplateRegion(
		@Args("regionId", { type: () => ID }) regionId: string,
		@Args("input") input: UpdateRegionInput,
		@CurrentUser() user: any,
	) {
		return this.templatesService.updateRegion(regionId, input, user.sub);
	}

	@Mutation(() => TemplateRegion)
	async deleteTemplateRegion(
		@Args("regionId", { type: () => ID }) regionId: string,
		@CurrentUser() user: any,
	) {
		return this.templatesService.deleteRegion(regionId, user.sub);
	}

	@Mutation(() => [TemplateRegion])
	async reorderTemplateRegions(
		@Args("templateId", { type: () => ID }) templateId: string,
		@Args("regionIds", { type: () => [ID] }) regionIds: string[],
		@CurrentUser() user: any,
	) {
		return this.templatesService.reorderRegions(
			templateId,
			regionIds,
			user.sub,
		);
	}
}
