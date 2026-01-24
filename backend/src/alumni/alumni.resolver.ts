import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql"
import { GraphQLJSON } from 'graphql-type-json';
import { UseGuards } from "@nestjs/common";
import { AlumniService } from "./alumni.service";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

/**
 * Alumni Portal Resolver
 * Implements GraphQL endpoints for alumni/guest features as per Specification Section 2A.6
 *
 * Provides:
 * - Public course catalog browsing
 * - Career services access
 * - Alumni networking and events
 * - Continuing education enrollment
 */
@Resolver()
export class AlumniResolver {
	constructor(private alumniService: AlumniService) {}

	// ============================
	// Public Queries (No Auth Required)
	// ============================

	@Query(() => GraphQLJSON, { name: "publicCourseCatalog" })
	async browsePublicCatalog(
		@Args("category", { nullable: true }) category?: string,
		@Args("level", { nullable: true }) level?: string,
		@Args("search", { nullable: true }) search?: string,
		@Args("skip", { type: () => Int, nullable: true }) skip?: number,
		@Args("take", { type: () => Int, nullable: true }) take?: number,
	) {
		return this.alumniService.browseCourseCatalog({
			category,
			level,
			search,
			skip,
			take,
		});
	}

	@Query(() => [GraphQLJSON], { name: "publicCourseCategories" })
	async getCourseCategories() {
		return this.alumniService.getCourseCategories();
	}

	@Query(() => GraphQLJSON, { name: "publicResources" })
	async getPublicResources() {
		return this.alumniService.getPublicResources();
	}

	// ============================
	// Alumni Dashboard (Auth Required)
	// ============================

	@Query(() => GraphQLJSON, { name: "alumniDashboard" })
	@UseGuards(GqlAuthGuard)
	async getAlumniDashboard(@CurrentUser() user: any) {
		return this.alumniService.getAlumniDashboard(user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "updateAlumniProfile" })
	@UseGuards(GqlAuthGuard)
	async updateProfile(
		@Args("name", { nullable: true }) name: string,
		@Args("phone", { nullable: true }) phone: string,
		@Args("avatarUrl", { nullable: true }) avatarUrl: string,
		@Args("linkedIn", { nullable: true }) linkedIn: string,
		@Args("company", { nullable: true }) company: string,
		@Args("jobTitle", { nullable: true }) jobTitle: string,
		@Args("graduationYear", { nullable: true }) graduationYear: string,
		@CurrentUser() user: any,
	) {
		return this.alumniService.updateAlumniProfile(user.sub, {
			name,
			phone,
			avatarUrl,
			linkedIn,
			company,
			jobTitle,
			graduationYear,
		});
	}

	// ============================
	// Continuing Education
	// ============================

	@Query(() => [GraphQLJSON], { name: "continuingEducationPrograms" })
	async getContinuingEducation() {
		return this.alumniService.getContinuingEducationPrograms();
	}

	@Mutation(() => GraphQLJSON, { name: "enrollInContinuingEducation" })
	@UseGuards(GqlAuthGuard)
	async enrollInProgram(
		@Args("courseId", { type: () => ID }) courseId: string,
		@CurrentUser() user: any,
	) {
		return this.alumniService.enrollInProgram(user.sub, courseId);
	}

	// ============================
	// Career Services
	// ============================

	@Query(() => GraphQLJSON, { name: "careerResources" })
	@UseGuards(GqlAuthGuard)
	async getCareerResources() {
		return this.alumniService.getCareerResources();
	}

	@Mutation(() => GraphQLJSON, { name: "requestCareerService" })
	@UseGuards(GqlAuthGuard)
	async requestCareerService(
		@Args("serviceType") serviceType: string,
		@Args("details", { nullable: true }) details: string,
		@CurrentUser() user: any,
	) {
		return this.alumniService.requestCareerService(
			user.sub,
			serviceType,
			details,
		);
	}

	// ============================
	// Events & Networking
	// ============================

	@Query(() => [GraphQLJSON], { name: "alumniEvents" })
	@UseGuards(GqlAuthGuard)
	async getUpcomingEvents(@CurrentUser() user: any) {
		return this.alumniService.getUpcomingEvents(user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "registerForAlumniEvent" })
	@UseGuards(GqlAuthGuard)
	async registerForEvent(
		@Args("eventId", { type: () => ID }) eventId: string,
		@CurrentUser() user: any,
	) {
		return this.alumniService.registerForEvent(user.sub, eventId);
	}

	// ============================
	// Alumni Directory
	// ============================

	@Query(() => GraphQLJSON, { name: "alumniDirectory" })
	@UseGuards(GqlAuthGuard)
	async searchDirectory(
		@CurrentUser() user: any,
		@Args("search", { nullable: true }) search?: string,
		@Args("graduationYear", { nullable: true }) graduationYear?: string,
		@Args("company", { nullable: true }) company?: string,
		@Args("skip", { type: () => Int, nullable: true }) skip?: number,
		@Args("take", { type: () => Int, nullable: true }) take?: number,
	) {
		return this.alumniService.searchAlumniDirectory(user.sub, {
			search,
			graduationYear,
			company,
			skip,
			take,
		});
	}

	// ============================
	// Certificates & Transcripts
	// ============================

	@Query(() => [GraphQLJSON], { name: "alumniCertificates" })
	@UseGuards(GqlAuthGuard)
	async getCertificates(@CurrentUser() user: any) {
		return this.alumniService.getAlumniCertificates(user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "requestAlumniTranscript" })
	@UseGuards(GqlAuthGuard)
	async requestTranscript(
		@Args("purpose", { nullable: true }) purpose: string,
		@Args("copies", { type: () => Int, nullable: true }) copies: number,
		@Args("deliveryMethod", { nullable: true }) deliveryMethod: string,
		@Args("address", { nullable: true }) address: string,
		@CurrentUser() user: any,
	) {
		return this.alumniService.requestTranscript(user.sub, {
			purpose,
			copies,
			deliveryMethod,
			address,
		});
	}
}


