import {
	Injectable,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
	CreateAssignmentInput,
	UpdateAssignmentInput,
	SubmitAssignmentInput,
	GradeSubmissionInput,
	AssignmentFilterInput,
} from "./dto/assignment.dto";

@Injectable()
export class AssignmentsService {
	constructor(private prisma: PrismaService) {}

	// ========== Assignment Management ==========

	async createAssignment(createdById: string, input: CreateAssignmentInput) {
		return this.prisma.assignment.create({
			data: {
				lessonId: input.lessonId,
				classSubjectId: input.classSubjectId,
				title: input.title,
				description: input.description,
				instructions: input.instructions,
				createdById,
				dueDate: input.dueDate,
				totalMarks: input.totalMarks || 100,
				allowLate: input.allowLate || false,
				latePenalty: input.latePenalty || 0,
				maxFileSize: input.maxFileSize,
				allowedFileTypes: input.allowedFileTypes
					? JSON.stringify(input.allowedFileTypes)
					: null,
				rubric: input.rubric,
				status: "DRAFT",
			},
		});
	}

	async updateAssignment(
		assignmentId: string,
		createdById: string,
		input: UpdateAssignmentInput,
	) {
		const assignment = await this.prisma.assignment.findUnique({
			where: { id: assignmentId },
		});
		if (!assignment) {
			throw new NotFoundException("Assignment not found");
		}
		if (assignment.createdById !== createdById) {
			throw new ForbiddenException(
				"You are not the creator of this assignment",
			);
		}

		return this.prisma.assignment.update({
			where: { id: assignmentId },
			data: {
				title: input.title,
				description: input.description,
				instructions: input.instructions,
				dueDate: input.dueDate,
				totalMarks: input.totalMarks,
				allowLate: input.allowLate,
				latePenalty: input.latePenalty,
				maxFileSize: input.maxFileSize,
				allowedFileTypes: input.allowedFileTypes
					? JSON.stringify(input.allowedFileTypes)
					: undefined,
				rubric: input.rubric,
				status: input.status,
			},
		});
	}

	async deleteAssignment(assignmentId: string, createdById: string) {
		const assignment = await this.prisma.assignment.findUnique({
			where: { id: assignmentId },
		});
		if (!assignment) {
			throw new NotFoundException("Assignment not found");
		}
		if (assignment.createdById !== createdById) {
			throw new ForbiddenException(
				"You are not the creator of this assignment",
			);
		}

		// Check for submissions
		const submissionCount = await this.prisma.assignmentSubmission.count({
			where: { assignmentId },
		});

		if (submissionCount > 0) {
			throw new BadRequestException(
				"Cannot delete assignment with submissions. Archive it instead.",
			);
		}

		await this.prisma.assignment.delete({ where: { id: assignmentId } });
		return true;
	}

	async publishAssignment(assignmentId: string, createdById: string) {
		const assignment = await this.prisma.assignment.findUnique({
			where: { id: assignmentId },
		});
		if (!assignment) {
			throw new NotFoundException("Assignment not found");
		}
		if (assignment.createdById !== createdById) {
			throw new ForbiddenException(
				"You are not the creator of this assignment",
			);
		}

		return this.prisma.assignment.update({
			where: { id: assignmentId },
			data: { status: "PUBLISHED" },
		});
	}

	async closeAssignment(assignmentId: string, createdById: string) {
		const assignment = await this.prisma.assignment.findUnique({
			where: { id: assignmentId },
		});
		if (!assignment) {
			throw new NotFoundException("Assignment not found");
		}
		if (assignment.createdById !== createdById) {
			throw new ForbiddenException(
				"You are not the creator of this assignment",
			);
		}

		return this.prisma.assignment.update({
			where: { id: assignmentId },
			data: { status: "CLOSED" },
		});
	}

	async getAssignment(assignmentId: string) {
		const assignment = await this.prisma.assignment.findUnique({
			where: { id: assignmentId },
			include: {
				submissions: true,
			},
		});

		if (!assignment) {
			throw new NotFoundException("Assignment not found");
		}

		return this.transformAssignment(assignment);
	}

	async getAssignments(filter: AssignmentFilterInput, createdById?: string) {
		const where: any = {};

		if (filter.search) {
			where.OR = [
				{ title: { contains: filter.search, mode: "insensitive" } },
				{ description: { contains: filter.search, mode: "insensitive" } },
			];
		}

		if (filter.classSubjectId) {
			where.classSubjectId = filter.classSubjectId;
		}

		if (filter.status) {
			where.status = filter.status;
		}

		if (createdById) {
			where.createdById = createdById;
		}

		const [assignments, total] = await Promise.all([
			this.prisma.assignment.findMany({
				where,
				include: {
					_count: { select: { submissions: true } },
				},
				skip: (filter.page - 1) * filter.pageSize,
				take: filter.pageSize,
				orderBy: { createdAt: "desc" },
			}),
			this.prisma.assignment.count({ where }),
		]);

		return {
			assignments: assignments.map((a) => ({
				...this.transformAssignment(a),
				totalSubmissions: a._count.submissions,
			})),
			total,
			page: filter.page,
			pageSize: filter.pageSize,
		};
	}

	async getCreatorAssignments(createdById: string) {
		const assignments = await this.prisma.assignment.findMany({
			where: { createdById },
			include: {
				_count: { select: { submissions: true } },
			},
			orderBy: { createdAt: "desc" },
		});

		return assignments.map((a) => ({
			...this.transformAssignment(a),
			totalSubmissions: a._count.submissions,
		}));
	}

	// ========== Submission Management ==========

	async submitAssignment(studentId: string, input: SubmitAssignmentInput) {
		const assignment = await this.prisma.assignment.findUnique({
			where: { id: input.assignmentId },
		});

		if (!assignment) {
			throw new NotFoundException("Assignment not found");
		}
		if (assignment.status !== "PUBLISHED") {
			throw new BadRequestException("Assignment is not accepting submissions");
		}

		// Check if past due date
		const now = new Date();
		const isLate = assignment.dueDate && now > assignment.dueDate;

		if (isLate && !assignment.allowLate) {
			throw new BadRequestException(
				"Assignment is past due and late submissions are not allowed",
			);
		}

		// Check if already submitted
		const existing = await this.prisma.assignmentSubmission.findFirst({
			where: { assignmentId: input.assignmentId, studentId },
		});

		if (existing) {
			// Update existing submission
			return this.prisma.assignmentSubmission.update({
				where: { id: existing.id },
				data: {
					content: input.content,
					fileUrl: input.fileUrl,
					fileName: input.fileName,
					isLate: isLate || false,
					status: "SUBMITTED",
					submittedAt: new Date(),
				},
				include: { assignment: true },
			});
		}

		// Create new submission
		return this.prisma.assignmentSubmission.create({
			data: {
				assignmentId: input.assignmentId,
				studentId,
				enrollmentId: input.enrollmentId,
				content: input.content,
				fileUrl: input.fileUrl,
				fileName: input.fileName,
				isLate: isLate || false,
				status: "SUBMITTED",
				maxScore: assignment.totalMarks,
			},
			include: { assignment: true },
		});
	}

	async getSubmission(submissionId: string, userId: string) {
		const submission = await this.prisma.assignmentSubmission.findUnique({
			where: { id: submissionId },
			include: { assignment: true },
		});

		if (!submission) {
			throw new NotFoundException("Submission not found");
		}

		// Check access: must be student or assignment creator
		if (
			submission.studentId !== userId &&
			submission.assignment.createdById !== userId
		) {
			throw new ForbiddenException("Access denied");
		}

		return submission;
	}

	async getAssignmentSubmissions(assignmentId: string, createdById: string) {
		const assignment = await this.prisma.assignment.findUnique({
			where: { id: assignmentId },
		});

		if (!assignment) {
			throw new NotFoundException("Assignment not found");
		}
		if (assignment.createdById !== createdById) {
			throw new ForbiddenException(
				"You are not the creator of this assignment",
			);
		}

		return this.prisma.assignmentSubmission.findMany({
			where: { assignmentId },
			include: { student: true },
			orderBy: { submittedAt: "desc" },
		});
	}

	async getStudentSubmissions(studentId: string) {
		return this.prisma.assignmentSubmission.findMany({
			where: { studentId },
			include: { assignment: true },
			orderBy: { submittedAt: "desc" },
		});
	}

	async gradeSubmission(graderId: string, input: GradeSubmissionInput) {
		const submission = await this.prisma.assignmentSubmission.findUnique({
			where: { id: input.submissionId },
			include: { assignment: true },
		});

		if (!submission) {
			throw new NotFoundException("Submission not found");
		}
		if (submission.assignment.createdById !== graderId) {
			throw new ForbiddenException(
				"You are not the creator of this assignment",
			);
		}

		// Apply late penalty if applicable
		let finalScore = input.score;
		if (submission.isLate && submission.assignment.latePenalty > 0) {
			const penaltyAmount =
				(input.score * submission.assignment.latePenalty) / 100;
			finalScore = Math.max(0, input.score - penaltyAmount);
		}

		return this.prisma.assignmentSubmission.update({
			where: { id: input.submissionId },
			data: {
				score: finalScore,
				feedback: input.feedback,
				status: "GRADED",
				gradedAt: new Date(),
				gradedById: graderId,
			},
			include: { assignment: true },
		});
	}

	async returnSubmission(submissionId: string, graderId: string) {
		const submission = await this.prisma.assignmentSubmission.findUnique({
			where: { id: submissionId },
			include: { assignment: true },
		});

		if (!submission) {
			throw new NotFoundException("Submission not found");
		}
		if (submission.assignment.createdById !== graderId) {
			throw new ForbiddenException(
				"You are not the creator of this assignment",
			);
		}

		return this.prisma.assignmentSubmission.update({
			where: { id: submissionId },
			data: { status: "RETURNED" },
			include: { assignment: true },
		});
	}

	// ========== Statistics ==========

	async getAssignmentStats(assignmentId: string, createdById: string) {
		const assignment = await this.prisma.assignment.findUnique({
			where: { id: assignmentId },
		});

		if (!assignment) {
			throw new NotFoundException("Assignment not found");
		}
		if (assignment.createdById !== createdById) {
			throw new ForbiddenException(
				"You are not the creator of this assignment",
			);
		}

		const submissions = await this.prisma.assignmentSubmission.findMany({
			where: { assignmentId },
		});

		const totalSubmitted = submissions.length;
		const totalGraded = submissions.filter((s) => s.status === "GRADED").length;
		const totalLate = submissions.filter((s) => s.isLate).length;
		const scores = submissions
			.filter((s) => s.score !== null)
			.map((s) => s.score as number);
		const averageScore =
			scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

		// Note: totalAssigned would require knowing the class size
		const totalAssigned = 0;

		return {
			totalAssigned,
			totalSubmitted,
			totalGraded,
			totalLate,
			averageScore,
			submissionRate:
				totalAssigned > 0 ? (totalSubmitted / totalAssigned) * 100 : 0,
		};
	}

	// ========== Helper Methods ==========

	private transformAssignment(assignment: any) {
		return {
			...assignment,
			allowedFileTypes: assignment.allowedFileTypes
				? this.parseJSON(assignment.allowedFileTypes)
				: [],
		};
	}

	private parseJSON(value: string): any {
		try {
			return JSON.parse(value);
		} catch {
			return value;
		}
	}
}
