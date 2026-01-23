import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import {
	CreateSubjectInput,
	UpdateSubjectInput,
	AssignSubjectInput,
	UpdateClassSubjectInput,
} from "../dto/lesson-tracking.inputs";

@Injectable()
export class SubjectsService {
	constructor(private prisma: PrismaService) {}

	async createSubject(input: CreateSubjectInput) {
		return this.prisma.subject.create({
			data: input,
		});
	}

	async findAll(search?: string) {
		const where: any = {};

		if (search) {
			where.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ code: { contains: search, mode: "insensitive" } },
			];
		}

		return this.prisma.subject.findMany({
			where,
			orderBy: { name: "asc" },
		});
	}

	async findOne(id: string) {
		const subject = await this.prisma.subject.findUnique({
			where: { id },
		});

		if (!subject) {
			throw new NotFoundException(`Subject with ID ${id} not found`);
		}

		return subject;
	}

	async update(id: string, input: UpdateSubjectInput) {
		await this.findOne(id);

		return this.prisma.subject.update({
			where: { id },
			data: input,
		});
	}

	async assignSubjectToClass(input: AssignSubjectInput) {
		// Check if already assigned
		const existing = await this.prisma.classSubject.findUnique({
			where: {
				classId_subjectId: {
					classId: input.classId,
					subjectId: input.subjectId,
				},
			},
		});

		if (existing) {
			throw new NotFoundException("Subject already assigned to this class");
		}

		return this.prisma.classSubject.create({
			data: input,
			include: {
				class: true,
				subject: true,
				teacher: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});
	}

	async updateClassSubject(id: string, input: UpdateClassSubjectInput) {
		return this.prisma.classSubject.update({
			where: { id },
			data: input,
			include: {
				class: true,
				subject: true,
				teacher: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});
	}

	async removeSubjectFromClass(id: string) {
		// Check if there are lessons
		const lessonCount = await this.prisma.lesson.count({
			where: { classSubjectId: id },
		});

		if (lessonCount > 0) {
			throw new NotFoundException(
				`Cannot remove subject with ${lessonCount} lessons. Delete lessons first.`,
			);
		}

		await this.prisma.classSubject.delete({ where: { id } });
		return true;
	}

	async findClassSubjects(classId?: string, teacherId?: string) {
		const where: any = {};

		if (classId) {
			where.classId = classId;
		}

		if (teacherId) {
			where.teacherId = teacherId;
		}

		return this.prisma.classSubject.findMany({
			where,
			include: {
				class: {
					include: {
						school: true,
					},
				},
				subject: true,
				teacher: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
				syllabus: true,
			},
		});
	}

	async findClassSubject(id: string) {
		const classSubject = await this.prisma.classSubject.findUnique({
			where: { id },
			include: {
				class: {
					include: {
						school: true,
					},
				},
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
		});

		if (!classSubject) {
			throw new NotFoundException(`Class subject with ID ${id} not found`);
		}

		return classSubject;
	}
}
