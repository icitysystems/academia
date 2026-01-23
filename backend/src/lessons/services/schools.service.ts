import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import {
	CreateSchoolInput,
	UpdateSchoolInput,
} from "../dto/lesson-tracking.inputs";
import { SchoolStatus } from "../models/lesson-tracking.models";

@Injectable()
export class SchoolsService {
	constructor(private prisma: PrismaService) {}

	async createSchool(userId: string, input: CreateSchoolInput) {
		const school = await this.prisma.school.create({
			data: {
				...input,
				status: "ACTIVE",
				teachers: {
					create: {
						teacherId: userId,
						isPrimary: true,
					},
				},
			},
			include: {
				teachers: true,
				classes: true,
			},
		});

		return school;
	}

	async findAll(userId: string, status?: SchoolStatus) {
		const where: any = {
			teachers: {
				some: {
					teacherId: userId,
				},
			},
		};

		if (status) {
			where.status = status;
		}

		return this.prisma.school.findMany({
			where,
			include: {
				teachers: true,
				classes: {
					where: { status: "ACTIVE" },
				},
			},
			orderBy: { createdAt: "desc" },
		});
	}

	async findOne(id: string, userId: string) {
		const school = await this.prisma.school.findFirst({
			where: {
				id,
				teachers: {
					some: {
						teacherId: userId,
					},
				},
			},
			include: {
				teachers: {
					include: {
						teacher: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				},
				classes: {
					where: { status: "ACTIVE" },
					include: {
						classSubjects: {
							include: {
								subject: true,
							},
						},
					},
				},
			},
		});

		if (!school) {
			throw new NotFoundException(`School with ID ${id} not found`);
		}

		return school;
	}

	async update(id: string, userId: string, input: UpdateSchoolInput) {
		// Verify user has access to this school
		await this.findOne(id, userId);

		return this.prisma.school.update({
			where: { id },
			data: input,
			include: {
				teachers: true,
				classes: true,
			},
		});
	}

	async delete(id: string, userId: string) {
		// Verify user has access to this school
		await this.findOne(id, userId);

		// Check if school has active classes
		const classCount = await this.prisma.class.count({
			where: { schoolId: id, status: "ACTIVE" },
		});

		if (classCount > 0) {
			throw new BadRequestException(
				`Cannot delete school with ${classCount} active classes. Archive classes first.`,
			);
		}

		await this.prisma.school.delete({ where: { id } });
		return true;
	}

	async addTeacherToSchool(
		schoolId: string,
		teacherId: string,
		isPrimary = false,
	) {
		const existing = await this.prisma.teacherSchool.findUnique({
			where: {
				teacherId_schoolId: {
					teacherId,
					schoolId,
				},
			},
		});

		if (existing) {
			throw new BadRequestException(
				"Teacher already associated with this school",
			);
		}

		await this.prisma.teacherSchool.create({
			data: {
				teacherId,
				schoolId,
				isPrimary,
			},
		});

		return true;
	}

	async removeTeacherFromSchool(schoolId: string, teacherId: string) {
		await this.prisma.teacherSchool.delete({
			where: {
				teacherId_schoolId: {
					teacherId,
					schoolId,
				},
			},
		});

		return true;
	}

	async getTeacherCount(schoolId: string): Promise<number> {
		return this.prisma.teacherSchool.count({
			where: { schoolId },
		});
	}
}
