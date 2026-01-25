import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class HomepageService implements OnModuleInit {
	private readonly logger = new Logger(HomepageService.name);

	constructor(private prisma: PrismaService) {}

	async onModuleInit() {
		// Seed default data if empty
		await this.seedDefaultDataIfEmpty();
	}

	// ========== Featured Courses ==========

	async getFeaturedCourses(limit = 4) {
		const featured = await this.prisma.featuredCourse.findMany({
			where: { isActive: true },
			orderBy: { displayOrder: "asc" },
			take: limit,
			include: {
				course: {
					include: {
						instructor: {
							select: { id: true, name: true, avatarUrl: true },
						},
						category: { select: { id: true, name: true } },
						enrollments: { select: { id: true } },
						reviews: {
							where: { isApproved: true },
							select: { rating: true },
						},
						_count: { select: { enrollments: true } },
					},
				},
			},
		});

		return featured.map((f) => {
			// Calculate actual rating from reviews
			const reviews = f.course.reviews || [];
			const avgRating =
				reviews.length > 0
					? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
					: 0;

			return {
				id: f.course.id,
				title: f.course.title,
				description: f.course.shortDescription || f.course.description,
				instructor: f.course.instructor?.name || "Academia Instructor",
				instructorAvatar: f.course.instructor?.avatarUrl,
				rating: Math.round(avgRating * 10) / 10, // Actual calculated rating
				reviewCount: reviews.length,
				students: f.course._count.enrollments,
				duration: f.course.duration
					? `${f.course.duration} hours`
					: "Self-paced",
				thumbnailUrl: f.course.thumbnailUrl,
				category: f.course.category?.name || "General",
				price:
					f.course.price === 0
						? "Free"
						: `$${(f.course.price / 100).toFixed(2)}`,
				level: f.course.level,
			};
		});
	}

	async setFeaturedCourse(courseId: string, order: number) {
		// Check if featured course exists
		const existing = await this.prisma.featuredCourse.findFirst({
			where: { courseId },
		});

		if (existing) {
			return this.prisma.featuredCourse.update({
				where: { id: existing.id },
				data: {
					displayOrder: order,
					isActive: true,
				},
			});
		}

		return this.prisma.featuredCourse.create({
			data: {
				courseId,
				displayOrder: order,
				isActive: true,
			},
		});
	}

	async removeFeaturedCourse(courseId: string) {
		return this.prisma.featuredCourse.updateMany({
			where: { courseId },
			data: { isActive: false },
		});
	}

	// ========== Testimonials ==========

	async getTestimonials(limit = 3) {
		return this.prisma.testimonial.findMany({
			where: { isActive: true },
			orderBy: { displayOrder: "asc" },
			take: limit,
			select: {
				id: true,
				name: true,
				role: true,
				content: true,
				avatarUrl: true,
				rating: true,
			},
		});
	}

	async createTestimonial(data: {
		name: string;
		role: string;
		content: string;
		avatarUrl?: string;
		rating?: number;
		displayOrder?: number;
	}) {
		return this.prisma.testimonial.create({
			data: {
				name: data.name,
				role: data.role,
				content: data.content,
				avatarUrl: data.avatarUrl,
				rating: data.rating || 5,
				displayOrder: data.displayOrder || 0,
				isActive: true,
			},
		});
	}

	async updateTestimonial(
		id: string,
		data: Partial<{
			name: string;
			role: string;
			content: string;
			avatarUrl: string;
			rating: number;
			displayOrder: number;
			isActive: boolean;
		}>,
	) {
		return this.prisma.testimonial.update({
			where: { id },
			data,
		});
	}

	async deleteTestimonial(id: string) {
		return this.prisma.testimonial.delete({ where: { id } });
	}

	// ========== Platform Statistics ==========

	async getPlatformStats() {
		// Get or create stats
		let stats = await this.prisma.platformStats.findFirst({
			orderBy: { lastUpdated: "desc" },
		});

		// If stats are older than 1 hour, refresh them
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
		if (!stats || stats.lastUpdated < oneHourAgo) {
			stats = await this.refreshPlatformStats();
		}

		return {
			totalStudents: stats.totalStudents,
			totalCourses: stats.totalCourses,
			totalInstructors: stats.totalInstructors,
			completionRate: stats.completionRate,
		};
	}

	async refreshPlatformStats() {
		const [
			studentCount,
			courseCount,
			instructorCount,
			completedEnrollments,
			totalEnrollments,
		] = await Promise.all([
			this.prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
			this.prisma.course.count({ where: { status: "PUBLISHED" } }),
			this.prisma.user.count({ where: { role: "FACULTY", isActive: true } }),
			this.prisma.enrollment.count({ where: { status: "COMPLETED" } }),
			this.prisma.enrollment.count(),
		]);

		const completionRate =
			totalEnrollments > 0
				? Math.round((completedEnrollments / totalEnrollments) * 100)
				: 0;

		// Upsert the stats
		const existingStats = await this.prisma.platformStats.findFirst();

		if (existingStats) {
			return this.prisma.platformStats.update({
				where: { id: existingStats.id },
				data: {
					totalStudents: studentCount,
					totalCourses: courseCount,
					totalInstructors: instructorCount,
					completionRate,
					lastUpdated: new Date(),
				},
			});
		}

		return this.prisma.platformStats.create({
			data: {
				totalStudents: studentCount,
				totalCourses: courseCount,
				totalInstructors: instructorCount,
				completionRate,
			},
		});
	}

	// ========== Homepage Data (Combined) ==========

	async getHomepageData() {
		const [featuredCourses, testimonials, stats] = await Promise.all([
			this.getFeaturedCourses(4),
			this.getTestimonials(3),
			this.getPlatformStats(),
		]);

		return {
			featuredCourses,
			testimonials,
			stats,
		};
	}

	// ========== Seed Default Data ==========

	private async seedDefaultDataIfEmpty() {
		try {
			// Seed testimonials if empty
			const testimonialCount = await this.prisma.testimonial.count();
			if (testimonialCount === 0) {
				this.logger.log("Seeding default testimonials...");
				await this.prisma.testimonial.createMany({
					data: [
						{
							name: "Jennifer Adams",
							role: "High School Teacher",
							content:
								"Academia has transformed how I create and deliver my courses. The ML grading system saves me hours every week!",
							rating: 5,
							displayOrder: 1,
							isActive: true,
						},
						{
							name: "Mark Thompson",
							role: "University Professor",
							content:
								"The exam paper builder and auto-grading features are incredibly powerful. My students get faster feedback, and I can focus on teaching.",
							rating: 5,
							displayOrder: 2,
							isActive: true,
						},
						{
							name: "Sarah Chen",
							role: "Online Course Creator",
							content:
								"I've tried many platforms, but Academia's pedagogic tools and lesson planning features are unmatched. Highly recommend!",
							rating: 5,
							displayOrder: 3,
							isActive: true,
						},
					],
				});
				this.logger.log("Default testimonials seeded successfully");
			}

			// Seed platform stats if empty
			const statsCount = await this.prisma.platformStats.count();
			if (statsCount === 0) {
				this.logger.log("Initializing platform stats...");
				await this.refreshPlatformStats();
				this.logger.log("Platform stats initialized");
			}

			// Auto-feature published courses if none featured
			const featuredCount = await this.prisma.featuredCourse.count({
				where: { isActive: true },
			});
			if (featuredCount === 0) {
				const publishedCourses = await this.prisma.course.findMany({
					where: { status: "PUBLISHED", isPublic: true },
					take: 4,
					orderBy: { createdAt: "desc" },
				});

				if (publishedCourses.length > 0) {
					this.logger.log("Auto-featuring published courses...");
					await this.prisma.featuredCourse.createMany({
						data: publishedCourses.map((course, index) => ({
							courseId: course.id,
							displayOrder: index + 1,
							isActive: true,
						})),
					});
					this.logger.log(`Featured ${publishedCourses.length} courses`);
				}
			}
		} catch (error) {
			this.logger.error("Error seeding default data:", error);
		}
	}
}
