import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GraphQLJSON } from "graphql-type-json";
import { PrismaService } from "../prisma.service";
import { UsersService } from "./users.service";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import {
	Roles,
	FacultyOrAdmin,
	AdminOnly,
	StudentOrParent,
} from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/types";

/**
 * Users Resolver implementing role-based GraphQL endpoints
 * as per Specification Sections 2A and 3A
 */
@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class UsersResolver {
	constructor(
		private prisma: PrismaService,
		private usersService: UsersService,
	) {}

	@Query(() => String)
	hello() {
		return "hello from backend";
	}

	// ============================
	// User Profile (All Roles)
	// ============================

	@Query(() => GraphQLJSON, { name: "me" })
	async getCurrentUser(@CurrentUser() user: any) {
		return this.usersService.getUser(user.sub);
	}

	@Query(() => GraphQLJSON, { name: "user" })
	async getUser(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.usersService.getUser(id);
	}

	// ============================
	// Admin User Management (2A.3)
	// ============================

	@Query(() => GraphQLJSON, { name: "users" })
	@Roles(UserRole.ADMIN)
	async listUsers(
		@CurrentUser() user: any,
		@Args("role", { nullable: true }) role?: string,
		@Args("isActive", { nullable: true }) isActive?: boolean,
		@Args("search", { nullable: true }) search?: string,
		@Args("skip", { type: () => Int, nullable: true }) skip?: number,
		@Args("take", { type: () => Int, nullable: true }) take?: number,
	) {
		return this.usersService.listUsers(user.sub, {
			role,
			isActive,
			search,
			skip,
			take,
		});
	}

	@Mutation(() => GraphQLJSON, { name: "createUser" })
	@Roles(UserRole.ADMIN)
	async createUser(
		@Args("email") email: string,
		@Args("name", { nullable: true }) name: string,
		@Args("role", { nullable: true }) role: string,
		@CurrentUser() user: any,
	) {
		return this.usersService.createUser({ email, name, role }, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "updateUser" })
	async updateUser(
		@Args("id", { type: () => ID }) id: string,
		@Args("name", { nullable: true }) name: string,
		@Args("phone", { nullable: true }) phone: string,
		@Args("role", { nullable: true }) role: string,
		@CurrentUser() user: any,
	) {
		return this.usersService.updateUser(id, { name, phone, role }, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "deleteUser" })
	@Roles(UserRole.ADMIN)
	async deleteUser(
		@Args("id", { type: () => ID }) id: string,
		@Args("hardDelete", { nullable: true, defaultValue: false })
		hardDelete: boolean,
		@CurrentUser() user: any,
	) {
		return this.usersService.deleteUser(id, user.sub, hardDelete);
	}

	// ============================
	// Student Dashboard (2A.1, 3A.1)
	// ============================

	@Query(() => GraphQLJSON, { name: "studentDashboard" })
	@Roles(UserRole.STUDENT)
	async getStudentDashboard(@CurrentUser() user: any) {
		return this.usersService.getStudentDashboard(user.sub);
	}

	@Query(() => GraphQLJSON, { name: "studentGrades" })
	@Roles(UserRole.STUDENT, UserRole.PARENT)
	async getStudentGrades(
		@CurrentUser() user: any,
		@Args("studentId", { type: () => ID, nullable: true }) studentId?: string,
	) {
		// If parent viewing, use studentId; otherwise use own ID
		const targetId = studentId || user.sub;
		return this.usersService.getStudentGrades(targetId);
	}

	@Query(() => GraphQLJSON, {
		name: "myGrades",
		description: "Get current student's grades summary for dashboard",
	})
	@Roles(UserRole.STUDENT)
	async getMyGrades(@CurrentUser() user: any) {
		return this.usersService.getMyGrades(user.sub);
	}

	@Query(() => GraphQLJSON, {
		name: "myPayments",
		description: "Get current student's payment history for dashboard",
	})
	@Roles(UserRole.STUDENT)
	async getMyPayments(@CurrentUser() user: any) {
		return this.usersService.getMyPayments(user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "requestTranscript" })
	@Roles(UserRole.STUDENT)
	async requestTranscript(
		@Args("purpose", { nullable: true }) purpose: string,
		@Args("copies", { type: () => Int, nullable: true }) copies: number,
		@Args("deliveryMethod", { nullable: true }) deliveryMethod: string,
		@Args("address", { nullable: true }) address: string,
		@CurrentUser() user: any,
	) {
		return this.usersService.requestTranscript(user.sub, {
			purpose,
			copies,
			deliveryMethod,
			address,
		});
	}

	// ============================
	// Faculty Dashboard (2A.2, 3A.2)
	// ============================

	@Query(() => GraphQLJSON, { name: "facultyDashboard" })
	@Roles(UserRole.FACULTY)
	async getFacultyDashboard(@CurrentUser() user: any) {
		return this.usersService.getFacultyDashboard(user.sub);
	}

	@Query(() => [GraphQLJSON], { name: "classRoster" })
	@Roles(UserRole.FACULTY, UserRole.ADMIN)
	async getClassRoster(
		@Args("courseId", { type: () => ID }) courseId: string,
		@CurrentUser() user: any,
	) {
		return this.usersService.getClassRoster(user.sub, courseId);
	}

	@Query(() => GraphQLJSON, { name: "studentProgress" })
	@Roles(UserRole.FACULTY)
	async trackStudentProgress(
		@Args("studentId", { type: () => ID }) studentId: string,
		@Args("courseId", { type: () => ID }) courseId: string,
		@CurrentUser() user: any,
	) {
		return this.usersService.trackStudentProgress(
			user.sub,
			studentId,
			courseId,
		);
	}

	// ============================
	// Admin Dashboard (2A.3, 3A.3)
	// ============================

	@Query(() => GraphQLJSON, { name: "adminDashboard" })
	@Roles(UserRole.ADMIN)
	async getAdminDashboard(@CurrentUser() user: any) {
		return this.usersService.getAdminDashboard(user.sub);
	}

	// Frontend Admin Dashboard Queries
	@Query(() => GraphQLJSON, { name: "systemStats" })
	@Roles(UserRole.ADMIN)
	async getSystemStats(@CurrentUser() user: any) {
		return this.usersService.getSystemStats(user.sub);
	}

	@Query(() => GraphQLJSON, { name: "recentUsers" })
	@Roles(UserRole.ADMIN)
	async getRecentUsers(@CurrentUser() user: any) {
		return this.usersService.getRecentUsers(user.sub);
	}

	@Query(() => GraphQLJSON, { name: "recentEnrollments" })
	@Roles(UserRole.ADMIN)
	async getRecentEnrollments(@CurrentUser() user: any) {
		return this.usersService.getRecentEnrollments(user.sub);
	}

	@Query(() => GraphQLJSON, { name: "pendingApprovals" })
	@Roles(UserRole.ADMIN)
	async getPendingApprovals(@CurrentUser() user: any) {
		return this.usersService.getPendingApprovals(user.sub);
	}

	@Query(() => GraphQLJSON, { name: "systemAlerts" })
	@Roles(UserRole.ADMIN)
	async getSystemAlerts(@CurrentUser() user: any) {
		return this.usersService.getSystemAlerts(user.sub);
	}

	@Query(() => GraphQLJSON, { name: "allUsers" })
	@Roles(UserRole.ADMIN)
	async getAllUsers(
		@CurrentUser() user: any,
		@Args("role", { nullable: true }) role?: string,
		@Args("search", { nullable: true }) search?: string,
		@Args("page", { type: () => Int, nullable: true }) page?: number,
		@Args("limit", { type: () => Int, nullable: true }) limit?: number,
	) {
		return this.usersService.getAllUsers(user.sub, {
			role,
			search,
			page,
			limit,
		});
	}

	@Query(() => GraphQLJSON, { name: "institutionalReport" })
	@Roles(UserRole.ADMIN)
	async generateInstitutionalReport(
		@Args("reportType") reportType: string,
		@CurrentUser() user: any,
	) {
		return this.usersService.generateInstitutionalReport(user.sub, reportType);
	}

	// ============================
	// Support Staff (2A.4, 3A.4)
	// ============================

	@Query(() => GraphQLJSON, { name: "supportDashboard" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async getSupportDashboard(@CurrentUser() user: any) {
		return this.usersService.getSupportDashboard(user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "assignTicket" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async assignTicket(
		@Args("ticketId", { type: () => ID }) ticketId: string,
		@Args("assigneeId", { type: () => ID }) assigneeId: string,
		@CurrentUser() user: any,
	) {
		return this.usersService.assignTicket(ticketId, assigneeId, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "resolveTicket" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async resolveTicket(
		@Args("ticketId", { type: () => ID }) ticketId: string,
		@Args("resolution") resolution: string,
		@CurrentUser() user: any,
	) {
		return this.usersService.resolveTicket(ticketId, resolution, user.sub);
	}

	// ============================
	// Parent Dashboard (2A.5, 3A.5)
	// ============================

	@Query(() => GraphQLJSON, { name: "parentDashboard" })
	@Roles(UserRole.PARENT)
	async getParentDashboard(@CurrentUser() user: any) {
		return this.usersService.getParentDashboard(user.sub);
	}

	@Query(() => GraphQLJSON, { name: "childProgress" })
	@Roles(UserRole.PARENT)
	async getStudentProgressForParent(
		@Args("studentId", { type: () => ID }) studentId: string,
		@CurrentUser() user: any,
	) {
		return this.usersService.getStudentProgressForParent(user.sub, studentId);
	}

	// ============================
	// ADMISSIONS WORKFLOW (Spec 3A.2)
	// ============================

	/**
	 * Create admission application
	 * As per Spec 3A.2: "Admissions management"
	 */
	@Mutation(() => GraphQLJSON, { name: "createAdmissionApplication" })
	async createAdmissionApplication(
		@Args("email") email: string,
		@Args("name") name: string,
		@Args("program") program: string,
		@Args("firstName", { nullable: true }) firstName?: string,
		@Args("lastName", { nullable: true }) lastName?: string,
		@Args("phone", { nullable: true }) phone?: string,
		@CurrentUser() user?: any,
	) {
		return this.usersService.createAdmissionApplication(
			{ email, name, firstName, lastName, phone, program },
			user?.sub,
		);
	}

	/**
	 * Review admission application - Admin only
	 */
	@Mutation(() => GraphQLJSON, { name: "reviewAdmissionApplication" })
	@Roles(UserRole.ADMIN)
	async reviewAdmissionApplication(
		@Args("applicationId", { type: () => ID }) applicationId: string,
		@Args("decision") decision: string,
		@Args("notes", { nullable: true }) notes: string,
		@CurrentUser() user: any,
	) {
		return this.usersService.reviewAdmissionApplication(applicationId, {
			decision: decision as any,
			notes,
			reviewerId: user.sub,
		});
	}

	/**
	 * Get admission applications - Admin only
	 */
	@Query(() => GraphQLJSON, { name: "admissionApplications" })
	@Roles(UserRole.ADMIN)
	async getAdmissionApplications(
		@CurrentUser() user: any,
		@Args("status", { nullable: true }) status?: string,
		@Args("program", { nullable: true }) program?: string,
		@Args("startDate", { type: () => Date, nullable: true }) startDate?: Date,
		@Args("endDate", { type: () => Date, nullable: true }) endDate?: Date,
	) {
		return this.usersService.getAdmissionApplications(user.sub, {
			status,
			program,
			startDate,
			endDate,
		});
	}

	/**
	 * Bulk import students - Admin only
	 */
	@Mutation(() => GraphQLJSON, { name: "bulkImportStudents" })
	@Roles(UserRole.ADMIN)
	async bulkImportStudents(
		@Args("students", { type: () => GraphQLJSON })
		students: Array<{
			email: string;
			name: string;
			firstName?: string;
			lastName?: string;
			program?: string;
		}>,
		@CurrentUser() user: any,
	) {
		return this.usersService.bulkImportStudents(user.sub, students);
	}

	// ============================
	// GRADUATION MANAGEMENT (Spec 3A.2)
	// ============================

	/**
	 * Get graduation candidates - Admin only
	 * As per Spec 3A.2: "Graduation processing"
	 */
	@Query(() => GraphQLJSON, { name: "graduationCandidates" })
	@Roles(UserRole.ADMIN)
	async getGraduationCandidates(
		@CurrentUser() user: any,
		@Args("program", { nullable: true }) program?: string,
		@Args("graduationDate", { type: () => Date, nullable: true })
		graduationDate?: Date,
	) {
		return this.usersService.getGraduationCandidates(user.sub, {
			program,
			graduationDate,
		});
	}

	/**
	 * Process graduation for a student - Admin only
	 */
	@Mutation(() => GraphQLJSON, { name: "processGraduation" })
	@Roles(UserRole.ADMIN)
	async processGraduation(
		@Args("studentId", { type: () => ID }) studentId: string,
		@Args("graduationDate", { type: () => Date }) graduationDate: Date,
		@CurrentUser() user: any,
		@Args("honors", { nullable: true }) honors?: string,
		@Args("program", { nullable: true }) program?: string,
	) {
		return this.usersService.processGraduation(user.sub, studentId, {
			graduationDate,
			honors,
			program,
		});
	}

	/**
	 * Bulk process graduations - Admin only
	 */
	@Mutation(() => GraphQLJSON, { name: "bulkProcessGraduation" })
	@Roles(UserRole.ADMIN)
	async bulkProcessGraduation(
		@Args("studentIds", { type: () => [ID] }) studentIds: string[],
		@Args("graduationDate", { type: () => Date }) graduationDate: Date,
		@CurrentUser() user: any,
	) {
		return this.usersService.bulkProcessGraduation(
			user.sub,
			studentIds,
			graduationDate,
		);
	}
}
