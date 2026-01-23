import {
	Injectable,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
	CreateCourseInput,
	UpdateCourseInput,
	CreateModuleInput,
	CreateCourseLessonInput,
	CoursesFilterInput,
	UpdateProgressInput,
	CreateAnnouncementInput,
} from "./dto/course.dto";

@Injectable()
export class CoursesService {
	constructor(private prisma: PrismaService) {}

	// ========== Course Management ==========

	async createCourse(instructorId: string, input: CreateCourseInput) {
		return this.prisma.course.create({
			data: {
				code: input.code,
				title: input.title,
				description: input.description,
				shortDescription: input.shortDescription,
				thumbnailUrl: input.thumbnailUrl,
				bannerUrl: input.bannerUrl,
				instructorId,
				categoryId: input.categoryId,
				level: input.level || "BEGINNER",
				language: input.language || "en",
				duration: input.duration,
				price: input.price || 0,
				currency: input.currency || "XAF",
				isPublic: input.isPublic || false,
				maxEnrollments: input.maxEnrollments,
				startDate: input.startDate,
				endDate: input.endDate,
				prerequisites: input.prerequisites,
				learningOutcomes: input.learningOutcomes,
				syllabus: input.syllabus,
				status: "DRAFT",
			},
			include: {
				category: true,
				instructor: true,
			},
		});
	}

	async updateCourse(
		courseId: string,
		instructorId: string,
		input: UpdateCourseInput,
	) {
		const course = await this.prisma.course.findUnique({
			where: { id: courseId },
		});
		if (!course) {
			throw new NotFoundException("Course not found");
		}
		if (course.instructorId !== instructorId) {
			throw new ForbiddenException("You are not the instructor of this course");
		}

		return this.prisma.course.update({
			where: { id: courseId },
			data: {
				title: input.title,
				description: input.description,
				shortDescription: input.shortDescription,
				thumbnailUrl: input.thumbnailUrl,
				bannerUrl: input.bannerUrl,
				categoryId: input.categoryId,
				level: input.level,
				language: input.language,
				duration: input.duration,
				price: input.price,
				currency: input.currency,
				status: input.status,
				isPublic: input.isPublic,
				maxEnrollments: input.maxEnrollments,
				startDate: input.startDate,
				endDate: input.endDate,
				prerequisites: input.prerequisites,
				learningOutcomes: input.learningOutcomes,
				syllabus: input.syllabus,
			},
			include: {
				category: true,
				instructor: true,
				modules: {
					include: { lessons: true },
					orderBy: { orderIndex: "asc" },
				},
			},
		});
	}

	async publishCourse(courseId: string, instructorId: string) {
		const course = await this.prisma.course.findUnique({
			where: { id: courseId },
			include: { modules: { include: { lessons: true } } },
		});

		if (!course) {
			throw new NotFoundException("Course not found");
		}
		if (course.instructorId !== instructorId) {
			throw new ForbiddenException("You are not the instructor of this course");
		}
		if (course.modules.length === 0) {
			throw new BadRequestException(
				"Course must have at least one module before publishing",
			);
		}

		const hasLessons = course.modules.some((m) => m.lessons.length > 0);
		if (!hasLessons) {
			throw new BadRequestException(
				"Course must have at least one lesson before publishing",
			);
		}

		return this.prisma.course.update({
			where: { id: courseId },
			data: { status: "PUBLISHED", isPublic: true },
			include: {
				category: true,
				instructor: true,
			},
		});
	}

	async deleteCourse(courseId: string, instructorId: string) {
		const course = await this.prisma.course.findUnique({
			where: { id: courseId },
		});
		if (!course) {
			throw new NotFoundException("Course not found");
		}
		if (course.instructorId !== instructorId) {
			throw new ForbiddenException("You are not the instructor of this course");
		}

		// Check for active enrollments
		const activeEnrollments = await this.prisma.enrollment.count({
			where: { courseId, status: "ACTIVE" },
		});

		if (activeEnrollments > 0) {
			throw new BadRequestException(
				"Cannot delete course with active enrollments. Archive it instead.",
			);
		}

		await this.prisma.course.delete({ where: { id: courseId } });
		return true;
	}

	async getCourse(courseId: string) {
		const course = await this.prisma.course.findUnique({
			where: { id: courseId },
			include: {
				category: true,
				instructor: true,
				modules: {
					include: { lessons: true },
					orderBy: { orderIndex: "asc" },
				},
			},
		});

		if (!course) {
			throw new NotFoundException("Course not found");
		}

		return this.transformCourse(course);
	}

	async getCourseByCode(code: string) {
		const course = await this.prisma.course.findUnique({
			where: { code },
			include: {
				category: true,
				instructor: true,
				modules: {
					include: { lessons: true },
					orderBy: { orderIndex: "asc" },
				},
			},
		});

		if (!course) {
			throw new NotFoundException("Course not found");
		}

		return this.transformCourse(course);
	}

	async getCourses(filter: CoursesFilterInput) {
		const where: any = {
			status: "PUBLISHED",
			isPublic: true,
		};

		if (filter.search) {
			where.OR = [
				{ title: { contains: filter.search, mode: "insensitive" } },
				{ description: { contains: filter.search, mode: "insensitive" } },
				{ code: { contains: filter.search, mode: "insensitive" } },
			];
		}

		if (filter.categoryId) {
			where.categoryId = filter.categoryId;
		}

		if (filter.level) {
			where.level = filter.level;
		}

		if (filter.instructorId) {
			where.instructorId = filter.instructorId;
		}

		if (filter.language) {
			where.language = filter.language;
		}

		if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
			where.price = {};
			if (filter.minPrice !== undefined) where.price.gte = filter.minPrice;
			if (filter.maxPrice !== undefined) where.price.lte = filter.maxPrice;
		}

		const [courses, total] = await Promise.all([
			this.prisma.course.findMany({
				where,
				include: {
					category: true,
					instructor: true,
					_count: { select: { enrollments: true } },
				},
				skip: (filter.page - 1) * filter.pageSize,
				take: filter.pageSize,
				orderBy: { createdAt: "desc" },
			}),
			this.prisma.course.count({ where }),
		]);

		return {
			courses: courses.map((c) => ({
				...this.transformCourse(c),
				enrollmentCount: c._count.enrollments,
			})),
			total,
			page: filter.page,
			pageSize: filter.pageSize,
		};
	}

	async getInstructorCourses(instructorId: string) {
		const courses = await this.prisma.course.findMany({
			where: { instructorId },
			include: {
				category: true,
				modules: {
					include: { lessons: true },
					orderBy: { orderIndex: "asc" },
				},
				_count: { select: { enrollments: true } },
			},
			orderBy: { createdAt: "desc" },
		});

		return courses.map((c) => ({
			...this.transformCourse(c),
			enrollmentCount: c._count.enrollments,
		}));
	}

	async getCategories() {
		return this.prisma.courseCategory.findMany({
			orderBy: { orderIndex: "asc" },
			include: {
				children: true,
				_count: { select: { courses: true } },
			},
		});
	}

	// ========== Module Management ==========

	async createModule(instructorId: string, input: CreateModuleInput) {
		const course = await this.prisma.course.findUnique({
			where: { id: input.courseId },
		});
		if (!course) {
			throw new NotFoundException("Course not found");
		}
		if (course.instructorId !== instructorId) {
			throw new ForbiddenException("You are not the instructor of this course");
		}

		// Get next order index if not provided
		let orderIndex = input.orderIndex;
		if (orderIndex === undefined) {
			const maxOrder = await this.prisma.courseModule.aggregate({
				where: { courseId: input.courseId },
				_max: { orderIndex: true },
			});
			orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
		}

		return this.prisma.courseModule.create({
			data: {
				courseId: input.courseId,
				title: input.title,
				description: input.description,
				orderIndex,
				isPublished: input.isPublished || false,
				unlockDate: input.unlockDate,
			},
			include: { lessons: true },
		});
	}

	async updateModule(
		moduleId: string,
		instructorId: string,
		input: Partial<CreateModuleInput>,
	) {
		const module = await this.prisma.courseModule.findUnique({
			where: { id: moduleId },
			include: { course: true },
		});

		if (!module) {
			throw new NotFoundException("Module not found");
		}
		if (module.course.instructorId !== instructorId) {
			throw new ForbiddenException("You are not the instructor of this course");
		}

		return this.prisma.courseModule.update({
			where: { id: moduleId },
			data: {
				title: input.title,
				description: input.description,
				orderIndex: input.orderIndex,
				isPublished: input.isPublished,
				unlockDate: input.unlockDate,
			},
			include: { lessons: true },
		});
	}

	async deleteModule(moduleId: string, instructorId: string) {
		const module = await this.prisma.courseModule.findUnique({
			where: { id: moduleId },
			include: { course: true },
		});

		if (!module) {
			throw new NotFoundException("Module not found");
		}
		if (module.course.instructorId !== instructorId) {
			throw new ForbiddenException("You are not the instructor of this course");
		}

		await this.prisma.courseModule.delete({ where: { id: moduleId } });
		return true;
	}

	// ========== Lesson Management ==========

	async createLesson(instructorId: string, input: CreateCourseLessonInput) {
		const module = await this.prisma.courseModule.findUnique({
			where: { id: input.moduleId },
			include: { course: true },
		});

		if (!module) {
			throw new NotFoundException("Module not found");
		}
		if (module.course.instructorId !== instructorId) {
			throw new ForbiddenException("You are not the instructor of this course");
		}

		// Get next order index if not provided
		let orderIndex = input.orderIndex;
		if (orderIndex === undefined) {
			const maxOrder = await this.prisma.courseLesson.aggregate({
				where: { moduleId: input.moduleId },
				_max: { orderIndex: true },
			});
			orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
		}

		return this.prisma.courseLesson.create({
			data: {
				moduleId: input.moduleId,
				title: input.title,
				description: input.description,
				contentType: input.contentType || "VIDEO",
				contentUrl: input.contentUrl,
				contentText: input.contentText,
				duration: input.duration,
				orderIndex,
				isPublished: input.isPublished || false,
				isFree: input.isFree || false,
			},
		});
	}

	async updateLesson(
		lessonId: string,
		instructorId: string,
		input: Partial<CreateCourseLessonInput>,
	) {
		const lesson = await this.prisma.courseLesson.findUnique({
			where: { id: lessonId },
			include: { module: { include: { course: true } } },
		});

		if (!lesson) {
			throw new NotFoundException("Lesson not found");
		}
		if (lesson.module.course.instructorId !== instructorId) {
			throw new ForbiddenException("You are not the instructor of this course");
		}

		return this.prisma.courseLesson.update({
			where: { id: lessonId },
			data: {
				title: input.title,
				description: input.description,
				contentType: input.contentType,
				contentUrl: input.contentUrl,
				contentText: input.contentText,
				duration: input.duration,
				orderIndex: input.orderIndex,
				isPublished: input.isPublished,
				isFree: input.isFree,
			},
		});
	}

	async deleteLesson(lessonId: string, instructorId: string) {
		const lesson = await this.prisma.courseLesson.findUnique({
			where: { id: lessonId },
			include: { module: { include: { course: true } } },
		});

		if (!lesson) {
			throw new NotFoundException("Lesson not found");
		}
		if (lesson.module.course.instructorId !== instructorId) {
			throw new ForbiddenException("You are not the instructor of this course");
		}

		await this.prisma.courseLesson.delete({ where: { id: lessonId } });
		return true;
	}

	// ========== Enrollment Management ==========

	async enrollInCourse(studentId: string, courseId: string) {
		const course = await this.prisma.course.findUnique({
			where: { id: courseId },
		});
		if (!course) {
			throw new NotFoundException("Course not found");
		}
		if (course.status !== "PUBLISHED") {
			throw new BadRequestException("Cannot enroll in unpublished course");
		}

		// Check max enrollments
		if (course.maxEnrollments) {
			const currentEnrollments = await this.prisma.enrollment.count({
				where: { courseId },
			});
			if (currentEnrollments >= course.maxEnrollments) {
				throw new BadRequestException("Course has reached maximum enrollments");
			}
		}

		// Check if already enrolled
		const existing = await this.prisma.enrollment.findUnique({
			where: { courseId_studentId: { courseId, studentId } },
		});

		if (existing) {
			if (existing.status === "ACTIVE") {
				throw new BadRequestException("Already enrolled in this course");
			}
			// Reactivate if dropped
			return this.prisma.enrollment.update({
				where: { id: existing.id },
				data: { status: "ACTIVE", lastAccessedAt: new Date() },
				include: { course: { include: { category: true } } },
			});
		}

		// Create new enrollment
		return this.prisma.enrollment.create({
			data: {
				courseId,
				studentId,
				status: "ACTIVE",
			},
			include: { course: { include: { category: true } } },
		});
	}

	async getEnrollment(studentId: string, courseId: string) {
		const enrollment = await this.prisma.enrollment.findUnique({
			where: { courseId_studentId: { courseId, studentId } },
			include: {
				course: {
					include: {
						category: true,
						instructor: true,
						modules: {
							include: { lessons: true },
							orderBy: { orderIndex: "asc" },
						},
					},
				},
				lessonProgress: {
					include: { lesson: true },
				},
			},
		});

		if (!enrollment) {
			throw new NotFoundException("Enrollment not found");
		}

		return enrollment;
	}

	async getUserEnrollments(studentId: string) {
		const enrollments = await this.prisma.enrollment.findMany({
			where: { studentId },
			include: {
				course: { include: { category: true, instructor: true } },
			},
			orderBy: { enrolledAt: "desc" },
		});

		return {
			enrollments: enrollments.map((e) => ({
				...e,
				course: this.transformCourse(e.course),
			})),
			total: enrollments.length,
		};
	}

	async updateLessonProgress(
		studentId: string,
		enrollmentId: string,
		input: UpdateProgressInput,
	) {
		const enrollment = await this.prisma.enrollment.findUnique({
			where: { id: enrollmentId },
			include: {
				course: {
					include: {
						modules: { include: { lessons: true } },
					},
				},
			},
		});

		if (!enrollment) {
			throw new NotFoundException("Enrollment not found");
		}
		if (enrollment.studentId !== studentId) {
			throw new ForbiddenException("Not your enrollment");
		}

		// Determine status based on progress
		let status = "IN_PROGRESS";
		if (input.progressPercent >= 100 || input.isCompleted) {
			status = "COMPLETED";
		}

		// Update or create lesson progress
		const progress = await this.prisma.lessonProgress.upsert({
			where: {
				enrollmentId_lessonId: {
					enrollmentId,
					lessonId: input.lessonId,
				},
			},
			create: {
				enrollmentId,
				lessonId: input.lessonId,
				status,
				progressPercent: input.progressPercent || 0,
				timeSpent: input.timeSpent || 0,
				completedAt: status === "COMPLETED" ? new Date() : null,
			},
			update: {
				status,
				progressPercent: input.progressPercent,
				timeSpent: input.timeSpent,
				completedAt: status === "COMPLETED" ? new Date() : undefined,
			},
			include: { lesson: true },
		});

		// Calculate overall progress
		const totalLessons = enrollment.course.modules.reduce(
			(sum, m) => sum + m.lessons.length,
			0,
		);
		const completedLessons = await this.prisma.lessonProgress.count({
			where: { enrollmentId, status: "COMPLETED" },
		});

		const overallProgress =
			totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

		// Update enrollment progress
		await this.prisma.enrollment.update({
			where: { id: enrollmentId },
			data: {
				progress: overallProgress,
				status: overallProgress >= 100 ? "COMPLETED" : "ACTIVE",
				completedAt: overallProgress >= 100 ? new Date() : null,
				lastAccessedAt: new Date(),
			},
		});

		return progress;
	}

	async dropEnrollment(studentId: string, enrollmentId: string) {
		const enrollment = await this.prisma.enrollment.findUnique({
			where: { id: enrollmentId },
		});

		if (!enrollment) {
			throw new NotFoundException("Enrollment not found");
		}
		if (enrollment.studentId !== studentId) {
			throw new ForbiddenException("Not your enrollment");
		}

		return this.prisma.enrollment.update({
			where: { id: enrollmentId },
			data: { status: "DROPPED" },
		});
	}

	// ========== Certificates ==========

	async generateCertificate(studentId: string, enrollmentId: string) {
		const enrollment = await this.prisma.enrollment.findUnique({
			where: { id: enrollmentId },
			include: { course: true, certificate: true },
		});

		if (!enrollment) {
			throw new NotFoundException("Enrollment not found");
		}
		if (enrollment.studentId !== studentId) {
			throw new ForbiddenException("Not your enrollment");
		}
		if (enrollment.progress < 100) {
			throw new BadRequestException("Course not completed yet");
		}

		// Check if certificate already exists
		if (enrollment.certificate) {
			return enrollment.certificate;
		}

		// Generate certificate number
		const certificateNumber = `CERT-${Date.now()}-${Math.random()
			.toString(36)
			.substring(2, 11)
			.toUpperCase()}`;

		const certificate = await this.prisma.certificate.create({
			data: {
				studentId,
				courseId: enrollment.courseId,
				certificateNumber,
			},
			include: { course: true },
		});

		// Update enrollment with certificate ID
		await this.prisma.enrollment.update({
			where: { id: enrollmentId },
			data: { certificateId: certificate.id },
		});

		return certificate;
	}

	async getUserCertificates(studentId: string) {
		return this.prisma.certificate.findMany({
			where: { studentId },
			include: { course: true },
			orderBy: { issueDate: "desc" },
		});
	}

	// ========== Announcements ==========

	async createAnnouncement(
		instructorId: string,
		input: CreateAnnouncementInput,
	) {
		const course = await this.prisma.course.findUnique({
			where: { id: input.courseId },
		});
		if (!course) {
			throw new NotFoundException("Course not found");
		}
		if (course.instructorId !== instructorId) {
			throw new ForbiddenException("You are not the instructor of this course");
		}

		return this.prisma.courseAnnouncement.create({
			data: {
				courseId: input.courseId,
				title: input.title,
				content: input.content,
				authorId: instructorId,
				isPinned: input.isPinned || false,
			},
		});
	}

	async getCourseAnnouncements(courseId: string) {
		return this.prisma.courseAnnouncement.findMany({
			where: { courseId },
			include: { author: true },
			orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
		});
	}

	// ========== Helper Methods ==========

	private transformCourse(course: any) {
		return {
			...course,
			learningOutcomes: course.learningOutcomes
				? this.parseJSON(course.learningOutcomes)
				: [],
			prerequisites: course.prerequisites
				? this.parseJSON(course.prerequisites)
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
