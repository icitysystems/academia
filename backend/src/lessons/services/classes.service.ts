import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import {
	CreateClassInput,
	UpdateClassInput,
} from "../dto/lesson-tracking.inputs";
import { ClassStatus } from "../models/lesson-tracking.models";

@Injectable()
export class ClassesService {
	constructor(private prisma: PrismaService) {}

	async createClass(userId: string, input: CreateClassInput) {
		// Verify user has access to the school
		const schoolAccess = await this.prisma.teacherSchool.findFirst({
			where: {
				teacherId: userId,
				schoolId: input.schoolId,
			},
		});

		if (!schoolAccess) {
			throw new BadRequestException("You do not have access to this school");
		}

		return this.prisma.class.create({
			data: {
				...input,
				status: "ACTIVE",
			},
			include: {
				school: true,
				classSubjects: {
					include: {
						subject: true,
					},
				},
			},
		});
	}

	async findAll(userId: string, schoolId?: string, status?: ClassStatus) {
		const where: any = {
			school: {
				teachers: {
					some: {
						teacherId: userId,
					},
				},
			},
		};

		if (schoolId) {
			where.schoolId = schoolId;
		}

		if (status) {
			where.status = status;
		}

		return this.prisma.class.findMany({
			where,
			include: {
				school: true,
				classSubjects: {
					include: {
						subject: true,
						teacher: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});
	}

	async findOne(id: string, userId: string) {
		const classEntity = await this.prisma.class.findFirst({
			where: {
				id,
				school: {
					teachers: {
						some: {
							teacherId: userId,
						},
					},
				},
			},
			include: {
				school: true,
				classSubjects: {
					include: {
						subject: true,
						teacher: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						syllabus: {
							include: {
								units: {
									include: {
										chapters: {
											include: {
												topics: true,
											},
										},
									},
								},
							},
						},
					},
				},
				lessons: {
					take: 10,
					orderBy: { date: "desc" },
				},
			},
		});

		if (!classEntity) {
			throw new NotFoundException(`Class with ID ${id} not found`);
		}

		return classEntity;
	}

	async update(id: string, userId: string, input: UpdateClassInput) {
		await this.findOne(id, userId);

		return this.prisma.class.update({
			where: { id },
			data: input,
			include: {
				school: true,
				classSubjects: {
					include: {
						subject: true,
					},
				},
			},
		});
	}

	async delete(id: string, userId: string) {
		await this.findOne(id, userId);

		// Check if class has lessons
		const lessonCount = await this.prisma.lesson.count({
			where: { classId: id },
		});

		if (lessonCount > 0) {
			throw new BadRequestException(
				`Cannot delete class with ${lessonCount} lessons. Archive the class instead.`,
			);
		}

		await this.prisma.class.delete({ where: { id } });
		return true;
	}

	async archiveClass(id: string, userId: string) {
		await this.findOne(id, userId);

		return this.prisma.class.update({
			where: { id },
			data: { status: "ARCHIVED" },
			include: {
				school: true,
				classSubjects: {
					include: {
						subject: true,
					},
				},
			},
		});
	}
}
