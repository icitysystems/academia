import { Resolver, Query, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { ReportingService } from "./reporting.service";
import { ClassSummary } from "./models/class-summary.model";
import { TemplateQuestionAnalysis } from "./models/question-analysis.model";
import { StudentReport } from "./models/student-report.model";
import { ScoreDistribution } from "./models/score-distribution.model";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/types";
import GraphQLJSON from "graphql-type-json";

@Resolver()
@UseGuards(GqlAuthGuard)
export class ReportingResolver {
	constructor(private reportingService: ReportingService) {}

	@Query(() => ClassSummary)
	async classSummary(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.reportingService.getClassSummary(templateId, user.sub);
	}

	@Query(() => [TemplateQuestionAnalysis])
	async questionAnalysis(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.reportingService.getQuestionAnalysis(templateId, user.sub);
	}

	@Query(() => StudentReport)
	async studentReport(
		@Args("studentId") studentId: string,
		@CurrentUser() user: any,
	) {
		return this.reportingService.getStudentReport(studentId, user.sub);
	}

	@Query(() => String)
	async exportResultsCSV(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.reportingService.exportResultsCSV(templateId, user.sub);
	}

	@Query(() => [ScoreDistribution])
	async scoreDistribution(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.reportingService.getScoreDistribution(templateId, user.sub);
	}

	// ========================
	// ENROLLMENT & ACADEMIC REPORTING (Spec 3A)
	// ========================

	/**
	 * Get enrollment statistics
	 * As per Spec 3A.1: Admin dashboard enrollment monitoring
	 */
	@Query(() => GraphQLJSON, { description: "Get enrollment statistics" })
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	async enrollmentStats(
		@Args("startDate", { type: () => Date, nullable: true }) startDate?: Date,
		@Args("endDate", { type: () => Date, nullable: true }) endDate?: Date,
		@Args("departmentId", { nullable: true }) departmentId?: string,
	) {
		return this.reportingService.getEnrollmentStats({
			startDate,
			endDate,
			departmentId,
		});
	}

	/**
	 * Get academic performance trends
	 */
	@Query(() => GraphQLJSON, { description: "Get academic performance trends" })
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	async academicPerformanceTrends(
		@Args("courseId", { nullable: true }) courseId?: string,
		@Args("startDate", { type: () => Date, nullable: true }) startDate?: Date,
		@Args("endDate", { type: () => Date, nullable: true }) endDate?: Date,
	) {
		return this.reportingService.getAcademicPerformanceTrends({
			courseId,
			startDate,
			endDate,
		});
	}

	/**
	 * Get at-risk students report
	 * As per Spec 3A.1: Identify and monitor at-risk students
	 */
	@Query(() => GraphQLJSON, { description: "Get at-risk students analysis" })
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	async atRiskStudents(
		@Args("minGradePercent", { type: () => Number, nullable: true })
		minGradePercent?: number,
		@Args("minAttendancePercent", { type: () => Number, nullable: true })
		minAttendancePercent?: number,
		@Args("inactiveDays", { type: () => Number, nullable: true })
		inactiveDays?: number,
	) {
		return this.reportingService.getAtRiskStudents({
			minGradePercent,
			minAttendancePercent,
			inactiveDays,
		});
	}

	// ========================
	// FINANCIAL REPORTING (Spec 3A.3)
	// ========================

	/**
	 * Get financial reports
	 * As per Spec 3A.3: Financial reports for admin
	 */
	@Query(() => GraphQLJSON, { description: "Get financial reports" })
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN)
	async financialReports(
		@Args("startDate", { type: () => Date, nullable: true }) startDate?: Date,
		@Args("endDate", { type: () => Date, nullable: true }) endDate?: Date,
		@Args("reportType", { nullable: true }) reportType?: string,
	) {
		return this.reportingService.getFinancialReports({
			startDate,
			endDate,
			reportType,
		});
	}

	/**
	 * Get common mistakes analysis
	 * As per Spec: Teaching insights for improving instruction
	 */
	@Query(() => GraphQLJSON, {
		description: "Analyze common mistakes for teaching insights",
	})
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	async commonMistakesAnalysis(
		@Args("courseId", { nullable: true }) courseId?: string,
		@Args("quizId", { nullable: true }) quizId?: string,
		@Args("examPaperId", { nullable: true }) examPaperId?: string,
	) {
		return this.reportingService.getCommonMistakesAnalysis({
			courseId,
			quizId,
			examPaperId,
		});
	}

	// ========================
	// COMPLIANCE REPORTING (Spec 3A.4)
	// ========================

	/**
	 * Get compliance reports
	 * As per Spec 3A.4: Compliance reports
	 */
	@Query(() => GraphQLJSON, { description: "Get compliance and audit reports" })
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN)
	async complianceReports() {
		return this.reportingService.getComplianceReports();
	}

	// ========================
	// EXPORT UTILITIES
	// ========================

	/**
	 * Export report as XLSX/CSV
	 */
	@Query(() => String, {
		description: "Export report data as base64 encoded file",
	})
	@UseGuards(RolesGuard)
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	async exportReport(
		@Args("reportType") reportType: string,
		@Args("filters", { type: () => GraphQLJSON, nullable: true }) filters?: any,
	) {
		let data: any;

		switch (reportType) {
			case "enrollment":
				data = await this.reportingService.getEnrollmentStats(filters);
				break;
			case "financial":
				data = await this.reportingService.getFinancialReports(filters);
				break;
			case "atRisk":
				data = await this.reportingService.getAtRiskStudents(filters);
				break;
			default:
				throw new Error(`Unknown report type: ${reportType}`);
		}

		return this.reportingService.exportReportXLSX(reportType, data);
	}
}
