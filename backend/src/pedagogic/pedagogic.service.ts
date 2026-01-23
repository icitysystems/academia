import {
	Injectable,
	NotFoundException,
	ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
	GenerateSchemeInput,
	UpdateSchemeInput,
	CreateProgressionInput,
	UpdateProgressionInput,
	GeneratePresentationInput,
	UpdatePresentationInput,
	CreateExamPaperInput,
	UpdateExamPaperInput,
	ExamPaperFilterInput,
	CreateQuestionInput,
	UpdateQuestionInput,
	QuestionFilterInput,
} from "./dto/pedagogic.dto";

@Injectable()
export class PedagogicService {
	constructor(private prisma: PrismaService) {}

	// ========== Scheme of Work ==========

	async generateScheme(generatedById: string, input: GenerateSchemeInput) {
		// Get syllabus to generate weekly plans
		const syllabus = await this.prisma.syllabus.findUnique({
			where: { id: input.syllabusId },
			include: {
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
			throw new NotFoundException("Syllabus not found");
		}

		// Generate weekly breakdown
		const totalWeeks = input.totalWeeks || 12;
		const weeklyPlans = this.generateWeeklyPlans(syllabus, totalWeeks);

		return this.prisma.schemeOfWork.create({
			data: {
				syllabusId: input.syllabusId,
				academicYear: input.academicYear,
				term: input.term,
				generatedById,
				weeklyPlans: JSON.stringify(weeklyPlans),
				totalWeeks,
				status: "DRAFT",
			},
		});
	}

	private generateWeeklyPlans(syllabus: any, totalWeeks: number) {
		const plans: any[] = [];
		const allTopics: any[] = [];

		// Flatten all topics
		for (const unit of syllabus.units) {
			for (const chapter of unit.chapters) {
				for (const topic of chapter.topics) {
					allTopics.push({
						unitTitle: unit.title,
						chapterTitle: chapter.title,
						topicTitle: topic.title,
						estimatedHours: topic.estimatedHours || 1,
					});
				}
			}
		}

		// Distribute topics across weeks
		const topicsPerWeek = Math.ceil(allTopics.length / totalWeeks);
		for (let week = 1; week <= totalWeeks; week++) {
			const startIdx = (week - 1) * topicsPerWeek;
			const weekTopics = allTopics.slice(startIdx, startIdx + topicsPerWeek);
			plans.push({
				weekNumber: week,
				topics: weekTopics,
				objectives: weekTopics.map((t) => `Cover ${t.topicTitle}`),
			});
		}

		return plans;
	}

	async getScheme(id: string) {
		const scheme = await this.prisma.schemeOfWork.findUnique({
			where: { id },
		});

		if (!scheme) {
			throw new NotFoundException("Scheme of work not found");
		}

		return this.transformScheme(scheme);
	}

	async getSchemeBySyllabus(syllabusId: string) {
		const scheme = await this.prisma.schemeOfWork.findUnique({
			where: { syllabusId },
		});

		return scheme ? this.transformScheme(scheme) : null;
	}

	async updateScheme(id: string, userId: string, input: UpdateSchemeInput) {
		const scheme = await this.prisma.schemeOfWork.findUnique({
			where: { id },
		});

		if (!scheme) {
			throw new NotFoundException("Scheme of work not found");
		}
		if (scheme.generatedById !== userId) {
			throw new ForbiddenException("Not authorized to update this scheme");
		}

		return this.prisma.schemeOfWork.update({
			where: { id },
			data: {
				weeklyPlans: input.weeklyPlans,
				status: input.status,
			},
		});
	}

	async approveScheme(schemeId: string, approvedById: string) {
		const scheme = await this.prisma.schemeOfWork.findUnique({
			where: { id: schemeId },
		});

		if (!scheme) {
			throw new NotFoundException("Scheme of work not found");
		}

		return this.prisma.schemeOfWork.update({
			where: { id: schemeId },
			data: {
				status: "APPROVED",
				approvedById,
				approvedAt: new Date(),
			},
		});
	}

	async deleteScheme(id: string, userId: string) {
		const scheme = await this.prisma.schemeOfWork.findUnique({
			where: { id },
		});

		if (!scheme) {
			throw new NotFoundException("Scheme of work not found");
		}
		if (scheme.generatedById !== userId) {
			throw new ForbiddenException("Not authorized to delete this scheme");
		}

		await this.prisma.schemeOfWork.delete({ where: { id } });
		return true;
	}

	// ========== Progression Records ==========

	async createProgressionRecord(
		teacherId: string,
		input: CreateProgressionInput,
	) {
		return this.prisma.progressionRecord.create({
			data: {
				classSubjectId: input.classSubjectId,
				weekNumber: input.weekNumber,
				date: input.date,
				plannedTopic: input.plannedTopic,
				actualTopic: input.actualTopic,
				periodsUsed: input.periodsUsed,
				completionStatus: input.completionStatus || "NOT_COVERED",
				remarks: input.remarks,
				teacherId,
			},
		});
	}

	async updateProgressionRecord(
		id: string,
		teacherId: string,
		input: UpdateProgressionInput,
	) {
		const record = await this.prisma.progressionRecord.findUnique({
			where: { id },
		});

		if (!record) {
			throw new NotFoundException("Progression record not found");
		}
		if (record.teacherId !== teacherId) {
			throw new ForbiddenException("Not authorized to update this record");
		}

		return this.prisma.progressionRecord.update({
			where: { id },
			data: {
				actualTopic: input.actualTopic,
				periodsUsed: input.periodsUsed,
				completionStatus: input.completionStatus,
				remarks: input.remarks,
			},
		});
	}

	async getProgressionRecords(classSubjectId: string, teacherId?: string) {
		const where: any = { classSubjectId };
		if (teacherId) {
			where.teacherId = teacherId;
		}

		return this.prisma.progressionRecord.findMany({
			where,
			orderBy: [{ weekNumber: "asc" }, { date: "asc" }],
		});
	}

	// ========== Generated Presentations ==========

	async generatePresentation(
		createdById: string,
		input: GeneratePresentationInput,
	) {
		// Get topic or lesson content to generate slides
		let content: any = { title: input.title, slides: [] };

		if (input.topicId) {
			const topic = await this.prisma.syllabusTopic.findUnique({
				where: { id: input.topicId },
				include: {
					chapter: {
						include: {
							unit: true,
						},
					},
				},
			});

			if (topic) {
				content = this.generateSlidesFromTopic(topic);
			}
		} else if (input.lessonPlanId) {
			const lesson = await this.prisma.lesson.findUnique({
				where: { id: input.lessonPlanId },
				include: {
					topics: {
						include: {
							topic: true,
						},
					},
				},
			});

			if (lesson) {
				content = this.generateSlidesFromLesson(lesson);
			}
		}

		return this.prisma.generatedPresentation.create({
			data: {
				lessonPlanId: input.lessonPlanId,
				topicId: input.topicId,
				title: input.title,
				template: input.template || "DEFAULT",
				slideCount: content.slides.length,
				slidesData: JSON.stringify(content.slides),
				createdById,
			},
		});
	}

	private generateSlidesFromTopic(topic: any) {
		const slides: Array<{
			type: string;
			title: string;
			subtitle?: string;
			content?: string;
		}> = [
			{
				type: "title",
				title: topic.title,
				subtitle: `${topic.chapter.unit.title} > ${topic.chapter.title}`,
			},
			{
				type: "content",
				title: "Learning Objectives",
				content: topic.learningOutcomes || "Understand the key concepts",
			},
			{
				type: "content",
				title: topic.title,
				content: topic.description || "Topic content here",
			},
			{
				type: "summary",
				title: "Summary",
				content: "Key takeaways from this topic",
			},
		];
		return { title: topic.title, slides };
	}

	private generateSlidesFromLesson(lesson: any) {
		const slides: Array<{
			type: string;
			title: string;
			subtitle?: string;
			content?: string;
		}> = [
			{
				type: "title",
				title: lesson.title,
				subtitle: lesson.objectives || "",
			},
		];

		for (const lt of lesson.topics) {
			slides.push({
				type: "content",
				title: lt.topic?.title || "Topic",
				content: lt.topic?.description || "",
			});
		}

		slides.push({
			type: "summary",
			title: "Summary",
			content: "Key takeaways from this lesson",
		});

		return { title: lesson.title, slides };
	}

	async getPresentation(id: string) {
		const presentation = await this.prisma.generatedPresentation.findUnique({
			where: { id },
		});

		if (!presentation) {
			throw new NotFoundException("Presentation not found");
		}

		return presentation;
	}

	async getUserPresentations(createdById: string) {
		return this.prisma.generatedPresentation.findMany({
			where: { createdById },
			orderBy: { createdAt: "desc" },
		});
	}

	async updatePresentation(
		id: string,
		userId: string,
		input: UpdatePresentationInput,
	) {
		const presentation = await this.prisma.generatedPresentation.findUnique({
			where: { id },
		});

		if (!presentation) {
			throw new NotFoundException("Presentation not found");
		}
		if (presentation.createdById !== userId) {
			throw new ForbiddenException(
				"Not authorized to update this presentation",
			);
		}

		const data: any = {};
		if (input.title) data.title = input.title;
		if (input.slidesData) {
			data.slidesData = input.slidesData;
			try {
				const slides = JSON.parse(input.slidesData);
				data.slideCount = Array.isArray(slides) ? slides.length : 0;
			} catch {
				// Keep existing slide count
			}
		}

		return this.prisma.generatedPresentation.update({
			where: { id },
			data,
		});
	}

	async deletePresentation(id: string, userId: string) {
		const presentation = await this.prisma.generatedPresentation.findUnique({
			where: { id },
		});

		if (!presentation) {
			throw new NotFoundException("Presentation not found");
		}
		if (presentation.createdById !== userId) {
			throw new ForbiddenException(
				"Not authorized to delete this presentation",
			);
		}

		await this.prisma.generatedPresentation.delete({ where: { id } });
		return true;
	}

	// ========== Exam Papers ==========

	async createExamPaper(createdById: string, input: CreateExamPaperInput) {
		return this.prisma.examPaper.create({
			data: {
				title: input.title,
				subject: input.subject,
				classLevel: input.classLevel,
				examType: input.examType,
				academicYear: input.academicYear,
				term: input.term,
				duration: input.duration,
				totalMarks: input.totalMarks,
				sections: input.sections,
				instructions: input.instructions,
				coverPage: input.coverPage,
				markingScheme: input.markingScheme,
				createdById,
				status: "DRAFT",
			},
		});
	}

	async getExamPaper(id: string) {
		const paper = await this.prisma.examPaper.findUnique({
			where: { id },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		return paper;
	}

	async getExamPapers(filter: ExamPaperFilterInput, createdById?: string) {
		const where: any = {};

		if (filter.subject) where.subject = filter.subject;
		if (filter.classLevel) where.classLevel = filter.classLevel;
		if (filter.examType) where.examType = filter.examType;
		if (filter.academicYear) where.academicYear = filter.academicYear;
		if (filter.status) where.status = filter.status;
		if (createdById) where.createdById = createdById;

		const page = filter.page || 1;
		const pageSize = filter.pageSize || 10;

		const [items, total] = await Promise.all([
			this.prisma.examPaper.findMany({
				where,
				skip: (page - 1) * pageSize,
				take: pageSize,
				orderBy: { createdAt: "desc" },
			}),
			this.prisma.examPaper.count({ where }),
		]);

		return { items, total };
	}

	async updateExamPaper(
		id: string,
		userId: string,
		input: UpdateExamPaperInput,
	) {
		const paper = await this.prisma.examPaper.findUnique({
			where: { id },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}
		if (paper.createdById !== userId) {
			throw new ForbiddenException("Not authorized to update this exam paper");
		}

		return this.prisma.examPaper.update({
			where: { id },
			data: {
				title: input.title,
				subject: input.subject,
				classLevel: input.classLevel,
				examType: input.examType,
				duration: input.duration,
				totalMarks: input.totalMarks,
				sections: input.sections,
				instructions: input.instructions,
				coverPage: input.coverPage,
				markingScheme: input.markingScheme,
				status: input.status,
			},
		});
	}

	async deleteExamPaper(id: string, userId: string) {
		const paper = await this.prisma.examPaper.findUnique({
			where: { id },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}
		if (paper.createdById !== userId) {
			throw new ForbiddenException("Not authorized to delete this exam paper");
		}

		await this.prisma.examPaper.delete({ where: { id } });
		return true;
	}

	// ========== Question Bank ==========

	async createQuestion(createdById: string, input: CreateQuestionInput) {
		return this.prisma.questionBank.create({
			data: {
				subject: input.subject,
				topic: input.topic,
				questionText: input.questionText,
				questionType: input.questionType,
				options: input.options,
				correctAnswer: input.correctAnswer,
				explanation: input.explanation,
				marks: input.marks || 1,
				difficulty: input.difficulty || "MEDIUM",
				bloomLevel: input.bloomLevel,
				tags: input.tags ? JSON.stringify(input.tags) : null,
				createdById,
				isPublic: input.isPublic || false,
			},
		});
	}

	async getQuestion(id: string) {
		const question = await this.prisma.questionBank.findUnique({
			where: { id },
		});

		if (!question) {
			throw new NotFoundException("Question not found");
		}

		return this.transformQuestion(question);
	}

	async getQuestions(filter: QuestionFilterInput, createdById?: string) {
		const where: any = {};

		if (filter.subject) where.subject = filter.subject;
		if (filter.topic) where.topic = { contains: filter.topic };
		if (filter.questionType) where.questionType = filter.questionType;
		if (filter.difficulty) where.difficulty = filter.difficulty;
		if (filter.bloomLevel) where.bloomLevel = filter.bloomLevel;
		if (filter.isPublic !== undefined) where.isPublic = filter.isPublic;

		if (filter.search) {
			where.OR = [
				{ questionText: { contains: filter.search, mode: "insensitive" } },
				{ topic: { contains: filter.search, mode: "insensitive" } },
			];
		}

		// Show user's own questions or public questions
		if (createdById) {
			where.OR = [{ createdById }, { isPublic: true }];
		} else {
			where.isPublic = true;
		}

		const page = filter.page || 1;
		const pageSize = filter.pageSize || 10;

		const [questions, total] = await Promise.all([
			this.prisma.questionBank.findMany({
				where,
				skip: (page - 1) * pageSize,
				take: pageSize,
				orderBy: { createdAt: "desc" },
			}),
			this.prisma.questionBank.count({ where }),
		]);

		return {
			items: questions.map((q) => this.transformQuestion(q)),
			total,
		};
	}

	async updateQuestion(id: string, userId: string, input: UpdateQuestionInput) {
		const question = await this.prisma.questionBank.findUnique({
			where: { id },
		});

		if (!question) {
			throw new NotFoundException("Question not found");
		}
		if (question.createdById !== userId) {
			throw new ForbiddenException("Not authorized to update this question");
		}

		return this.prisma.questionBank.update({
			where: { id },
			data: {
				questionText: input.questionText,
				options: input.options,
				correctAnswer: input.correctAnswer,
				explanation: input.explanation,
				marks: input.marks,
				difficulty: input.difficulty,
				bloomLevel: input.bloomLevel,
				tags: input.tags ? JSON.stringify(input.tags) : undefined,
				isPublic: input.isPublic,
			},
		});
	}

	async deleteQuestion(id: string, userId: string) {
		const question = await this.prisma.questionBank.findUnique({
			where: { id },
		});

		if (!question) {
			throw new NotFoundException("Question not found");
		}
		if (question.createdById !== userId) {
			throw new ForbiddenException("Not authorized to delete this question");
		}

		await this.prisma.questionBank.delete({ where: { id } });
		return true;
	}

	async incrementQuestionUsage(id: string) {
		return this.prisma.questionBank.update({
			where: { id },
			data: { usageCount: { increment: 1 } },
		});
	}

	// ========== Helpers ==========

	private transformScheme(scheme: any) {
		return {
			...scheme,
			exportedFormats: scheme.exportedFormats
				? this.parseJSON(scheme.exportedFormats)
				: [],
		};
	}

	private transformQuestion(question: any) {
		return {
			...question,
			tags: question.tags ? this.parseJSON(question.tags) : [],
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
