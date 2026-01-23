import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import {
	CreateSyllabusInput,
	UpdateSyllabusInput,
	CreateSyllabusUnitInput,
	CreateSyllabusChapterInput,
	CreateSyllabusTopicInput,
} from "../dto/lesson-tracking.inputs";

@Injectable()
export class SyllabiService {
	constructor(private prisma: PrismaService) {}

	async createSyllabus(userId: string, input: CreateSyllabusInput) {
		// Get class subject and verify access
		const classSubject = await this.prisma.classSubject.findUnique({
			where: { id: input.classSubjectId },
			include: {
				class: {
					include: {
						school: {
							include: {
								teachers: {
									where: { teacherId: userId },
								},
							},
						},
					},
				},
				subject: true,
			},
		});

		if (!classSubject || classSubject.class.school.teachers.length === 0) {
			throw new NotFoundException("Class subject not found or access denied");
		}

		return this.prisma.syllabus.create({
			data: {
				...input,
				subjectId: classSubject.subjectId,
			},
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
		});
	}

	async findOne(id: string) {
		const syllabus = await this.prisma.syllabus.findUnique({
			where: { id },
			include: {
				classSubject: {
					include: {
						class: {
							include: {
								school: true,
							},
						},
						subject: true,
					},
				},
				units: {
					include: {
						chapters: {
							include: {
								topics: true,
							},
						},
					},
					orderBy: { orderIndex: "asc" },
				},
			},
		});

		if (!syllabus) {
			throw new NotFoundException(`Syllabus with ID ${id} not found`);
		}

		return syllabus;
	}

	async update(id: string, input: UpdateSyllabusInput) {
		await this.findOne(id);

		return this.prisma.syllabus.update({
			where: { id },
			data: input,
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
		});
	}

	async findTemplates(templateSource?: string) {
		const where: any = { isTemplate: true };

		if (templateSource) {
			where.templateSource = templateSource;
		}

		return this.prisma.syllabus.findMany({
			where,
			include: {
				subject: true,
				units: {
					include: {
						chapters: {
							include: {
								topics: true,
							},
						},
					},
					orderBy: { orderIndex: "asc" },
				},
			},
		});
	}

	async importTemplate(
		classSubjectId: string,
		templateId: string,
		userId: string,
	) {
		const template = await this.findOne(templateId);

		if (!template.isTemplate) {
			throw new NotFoundException("Specified syllabus is not a template");
		}

		// Verify access to class subject
		const classSubject = await this.prisma.classSubject.findUnique({
			where: { id: classSubjectId },
			include: {
				class: {
					include: {
						school: {
							include: {
								teachers: {
									where: { teacherId: userId },
								},
							},
						},
					},
				},
			},
		});

		if (!classSubject || classSubject.class.school.teachers.length === 0) {
			throw new NotFoundException("Class subject not found or access denied");
		}

		// Create new syllabus based on template
		const newSyllabus = await this.prisma.syllabus.create({
			data: {
				classSubjectId,
				subjectId: template.subjectId,
				name: template.name,
				description: template.description,
				templateSource: template.templateSource,
				totalTopics: template.totalTopics,
				totalHours: template.totalHours,
				isTemplate: false,
			},
		});

		// Copy units, chapters, and topics
		for (const unit of template.units) {
			const newUnit = await this.prisma.syllabusUnit.create({
				data: {
					syllabusId: newSyllabus.id,
					title: unit.title,
					description: unit.description,
					orderIndex: unit.orderIndex,
					estimatedHours: unit.estimatedHours,
				},
			});

			for (const chapter of unit.chapters) {
				const newChapter = await this.prisma.syllabusChapter.create({
					data: {
						unitId: newUnit.id,
						title: chapter.title,
						description: chapter.description,
						orderIndex: chapter.orderIndex,
						estimatedHours: chapter.estimatedHours,
					},
				});

				for (const topic of chapter.topics) {
					await this.prisma.syllabusTopic.create({
						data: {
							chapterId: newChapter.id,
							title: topic.title,
							description: topic.description,
							orderIndex: topic.orderIndex,
							estimatedHours: topic.estimatedHours,
							learningOutcomes: topic.learningOutcomes,
							prerequisites: topic.prerequisites,
						},
					});
				}
			}
		}

		return this.findOne(newSyllabus.id);
	}

	async createUnit(input: CreateSyllabusUnitInput) {
		return this.prisma.syllabusUnit.create({
			data: input,
			include: {
				chapters: {
					include: {
						topics: true,
					},
				},
			},
		});
	}

	async createChapter(input: CreateSyllabusChapterInput) {
		return this.prisma.syllabusChapter.create({
			data: input,
			include: {
				topics: true,
			},
		});
	}

	async createTopic(input: CreateSyllabusTopicInput) {
		// Convert arrays to JSON strings
		const data: any = { ...input };

		if (input.learningOutcomes) {
			data.learningOutcomes = JSON.stringify(input.learningOutcomes);
		}

		if (input.prerequisites) {
			data.prerequisites = JSON.stringify(input.prerequisites);
		}

		return this.prisma.syllabusTopic.create({
			data,
		});
	}

	async uploadSyllabusDocument(classSubjectId: string, fileUrl: string) {
		const syllabus = await this.prisma.syllabus.findUnique({
			where: { classSubjectId },
		});

		if (!syllabus) {
			throw new NotFoundException("Syllabus not found for this class subject");
		}

		return this.prisma.syllabus.update({
			where: { id: syllabus.id },
			data: { documentUrl: fileUrl },
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
		});
	}
}
