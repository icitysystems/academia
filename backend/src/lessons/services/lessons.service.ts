import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import {
	CreateLessonInput,
	UpdateLessonInput,
} from "../dto/lesson-tracking.inputs";
import { LessonStatus } from "../models/lesson-tracking.models";

@Injectable()
export class LessonsService {
	constructor(private prisma: PrismaService) {}

	async createLesson(userId: string, input: CreateLessonInput) {
		// Verify access to class
		const classEntity = await this.prisma.class.findFirst({
			where: {
				id: input.classId,
				school: {
					teachers: {
						some: {
							teacherId: userId,
						},
					},
				},
			},
		});

		if (!classEntity) {
			throw new NotFoundException("Class not found or access denied");
		}

		// Extract topic IDs and prepare lesson data
		const { topicIds, attendance, materialsUsed, ...lessonData } = input;

		const data: any = {
			...lessonData,
			teacherId: userId,
		};

		// Convert attendance to JSON string
		if (attendance) {
			data.attendance = JSON.stringify(attendance);
		}

		// Convert materials to JSON string
		if (materialsUsed) {
			data.materialsUsed = JSON.stringify(materialsUsed);
		}

		// Create lesson with topics
		const lesson = await this.prisma.lesson.create({
			data: {
				...data,
				topics: {
					create: topicIds.map((topicId) => ({
						topicId,
					})),
				},
			},
			include: {
				class: {
					include: {
						school: true,
					},
				},
				classSubject: {
					include: {
						subject: true,
					},
				},
				topics: {
					include: {
						topic: {
							include: {
								chapter: {
									include: {
										unit: true,
									},
								},
							},
						},
					},
				},
				attachments: true,
			},
		});

		return lesson;
	}

	async findAll(filters: {
		classId?: string;
		classSubjectId?: string;
		teacherId?: string;
		dateFrom?: Date;
		dateTo?: Date;
		status?: LessonStatus;
	}) {
		const where: any = {};

		if (filters.classId) {
			where.classId = filters.classId;
		}

		if (filters.classSubjectId) {
			where.classSubjectId = filters.classSubjectId;
		}

		if (filters.teacherId) {
			where.teacherId = filters.teacherId;
		}

		if (filters.status) {
			where.status = filters.status;
		}

		if (filters.dateFrom || filters.dateTo) {
			where.date = {};
			if (filters.dateFrom) {
				where.date.gte = filters.dateFrom;
			}
			if (filters.dateTo) {
				where.date.lte = filters.dateTo;
			}
		}

		return this.prisma.lesson.findMany({
			where,
			include: {
				class: {
					include: {
						school: true,
					},
				},
				classSubject: {
					include: {
						subject: true,
					},
				},
				topics: {
					include: {
						topic: true,
					},
				},
				attachments: true,
			},
			orderBy: { date: "desc" },
		});
	}

	async findOne(id: string) {
		const lesson = await this.prisma.lesson.findUnique({
			where: { id },
			include: {
				class: {
					include: {
						school: true,
					},
				},
				classSubject: {
					include: {
						subject: true,
					},
				},
				topics: {
					include: {
						topic: {
							include: {
								chapter: {
									include: {
										unit: true,
									},
								},
							},
						},
					},
				},
				attachments: true,
			},
		});

		if (!lesson) {
			throw new NotFoundException(`Lesson with ID ${id} not found`);
		}

		return lesson;
	}

	async update(id: string, userId: string, input: UpdateLessonInput) {
		const lesson = await this.findOne(id);

		// Verify ownership
		if (lesson.teacherId !== userId) {
			throw new NotFoundException("Access denied");
		}

		const { topicIds, attendance, materialsUsed, ...updateData } = input;

		const data: any = { ...updateData };

		if (attendance) {
			data.attendance = JSON.stringify(attendance);
		}

		if (materialsUsed) {
			data.materialsUsed = JSON.stringify(materialsUsed);
		}

		// Update topics if provided
		if (topicIds) {
			// Delete existing topic associations
			await this.prisma.lessonTopic.deleteMany({
				where: { lessonId: id },
			});

			// Create new associations
			data.topics = {
				create: topicIds.map((topicId) => ({
					topicId,
				})),
			};
		}

		return this.prisma.lesson.update({
			where: { id },
			data,
			include: {
				class: {
					include: {
						school: true,
					},
				},
				classSubject: {
					include: {
						subject: true,
					},
				},
				topics: {
					include: {
						topic: true,
					},
				},
				attachments: true,
			},
		});
	}

	async delete(id: string, userId: string) {
		const lesson = await this.findOne(id);

		// Verify ownership
		if (lesson.teacherId !== userId) {
			throw new NotFoundException("Access denied");
		}

		await this.prisma.lesson.delete({ where: { id } });
		return true;
	}

	async bulkCreate(userId: string, inputs: CreateLessonInput[]) {
		const lessons = [];

		for (const input of inputs) {
			const lesson = await this.createLesson(userId, input);
			lessons.push(lesson);
		}

		return lessons;
	}

	async addAttachment(
		lessonId: string,
		fileName: string,
		fileUrl: string,
		fileType: string,
		fileSize?: number,
	) {
		return this.prisma.lessonAttachment.create({
			data: {
				lessonId,
				fileName,
				fileUrl,
				fileType,
				fileSize,
			},
		});
	}

	async addLink(lessonId: string, url: string, title: string) {
		return this.prisma.lessonAttachment.create({
			data: {
				lessonId,
				fileName: title,
				fileUrl: url,
				fileType: "LINK",
			},
		});
	}

	async deleteAttachment(id: string) {
		await this.prisma.lessonAttachment.delete({ where: { id } });
		return true;
	}
}
