import { Resolver, Query, Mutation, Args, Int } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GraphQLJSON } from "graphql-type-json";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/types";
import { HomepageService } from "./homepage.service";

@Resolver()
export class HomepageResolver {
	constructor(private homepageService: HomepageService) {}

	// ========== Public Queries ==========

	@Query(() => GraphQLJSON, {
		name: "homepageData",
		description:
			"Get all homepage data including featured courses, testimonials, and stats",
	})
	async getHomepageData() {
		return this.homepageService.getHomepageData();
	}

	@Query(() => [GraphQLJSON], {
		name: "featuredCourses",
		description: "Get featured courses for homepage",
	})
	async getFeaturedCourses(
		@Args("limit", { type: () => Int, nullable: true, defaultValue: 4 })
		limit: number,
	) {
		return this.homepageService.getFeaturedCourses(limit);
	}

	@Query(() => [GraphQLJSON], {
		name: "testimonials",
		description: "Get testimonials for homepage",
	})
	async getTestimonials(
		@Args("limit", { type: () => Int, nullable: true, defaultValue: 3 })
		limit: number,
	) {
		return this.homepageService.getTestimonials(limit);
	}

	@Query(() => GraphQLJSON, {
		name: "platformStats",
		description: "Get platform statistics",
	})
	async getPlatformStats() {
		return this.homepageService.getPlatformStats();
	}

	// ========== Admin Mutations ==========

	@Mutation(() => GraphQLJSON, {
		name: "setFeaturedCourse",
		description: "Add or update a featured course",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async setFeaturedCourse(
		@Args("courseId") courseId: string,
		@Args("order", { type: () => Int }) order: number,
	) {
		return this.homepageService.setFeaturedCourse(courseId, order);
	}

	@Mutation(() => GraphQLJSON, {
		name: "removeFeaturedCourse",
		description: "Remove a course from featured list",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async removeFeaturedCourse(@Args("courseId") courseId: string) {
		await this.homepageService.removeFeaturedCourse(courseId);
		return { success: true };
	}

	@Mutation(() => GraphQLJSON, {
		name: "createTestimonial",
		description: "Create a new testimonial",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async createTestimonial(
		@Args("name") name: string,
		@Args("role") role: string,
		@Args("content") content: string,
		@Args("avatarUrl", { nullable: true }) avatarUrl?: string,
		@Args("rating", { type: () => Int, nullable: true, defaultValue: 5 })
		rating?: number,
		@Args("displayOrder", { type: () => Int, nullable: true, defaultValue: 0 })
		displayOrder?: number,
	) {
		return this.homepageService.createTestimonial({
			name,
			role,
			content,
			avatarUrl,
			rating,
			displayOrder,
		});
	}

	@Mutation(() => GraphQLJSON, {
		name: "updateTestimonial",
		description: "Update a testimonial",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async updateTestimonial(
		@Args("id") id: string,
		@Args("name", { nullable: true }) name?: string,
		@Args("role", { nullable: true }) role?: string,
		@Args("content", { nullable: true }) content?: string,
		@Args("avatarUrl", { nullable: true }) avatarUrl?: string,
		@Args("rating", { type: () => Int, nullable: true }) rating?: number,
		@Args("displayOrder", { type: () => Int, nullable: true })
		displayOrder?: number,
		@Args("isActive", { nullable: true }) isActive?: boolean,
	) {
		const data: any = {};
		if (name !== undefined) data.name = name;
		if (role !== undefined) data.role = role;
		if (content !== undefined) data.content = content;
		if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
		if (rating !== undefined) data.rating = rating;
		if (displayOrder !== undefined) data.displayOrder = displayOrder;
		if (isActive !== undefined) data.isActive = isActive;

		return this.homepageService.updateTestimonial(id, data);
	}

	@Mutation(() => GraphQLJSON, {
		name: "deleteTestimonial",
		description: "Delete a testimonial",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async deleteTestimonial(@Args("id") id: string) {
		await this.homepageService.deleteTestimonial(id);
		return { success: true };
	}

	@Mutation(() => GraphQLJSON, {
		name: "refreshPlatformStats",
		description: "Manually refresh platform statistics",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async refreshPlatformStats() {
		return this.homepageService.refreshPlatformStats();
	}
}
