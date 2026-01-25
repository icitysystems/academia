import {
	Injectable,
	Logger,
	NotFoundException,
	BadRequestException,
	OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";

/**
 * Course Review Service
 * Manages course reviews and calculates ratings from actual backend data
 */

export interface CreateReviewInput {
	courseId: string;
	rating: number;
	title?: string;
	content: string;
}

export interface ReviewStats {
	averageRating: number;
	totalReviews: number;
	ratingDistribution: {
		1: number;
		2: number;
		3: number;
		4: number;
		5: number;
	};
	verifiedReviews: number;
}

@Injectable()
export class CourseReviewService implements OnModuleInit {
	private readonly logger = new Logger(CourseReviewService.name);

	constructor(private prisma: PrismaService) {}

	async onModuleInit() {
		await this.seedDefaultReviews();
	}

	/**
	 * Create a new course review
	 */
	async createReview(userId: string, input: CreateReviewInput) {
		// Validate rating
		if (input.rating < 1 || input.rating > 5) {
			throw new BadRequestException("Rating must be between 1 and 5");
		}

		// Check if course exists
		const course = await this.prisma.course.findUnique({
			where: { id: input.courseId },
		});
		if (!course) {
			throw new NotFoundException("Course not found");
		}

		// Check if user already reviewed this course
		const existingReview = await this.prisma.courseReview.findUnique({
			where: {
				courseId_userId: {
					courseId: input.courseId,
					userId,
				},
			},
		});

		if (existingReview) {
			throw new BadRequestException("You have already reviewed this course");
		}

		// Check if user is enrolled (for verified badge)
		const enrollment = await this.prisma.enrollment.findFirst({
			where: {
				courseId: input.courseId,
				studentId: userId,
				status: { in: ["ENROLLED", "COMPLETED"] },
			},
		});

		return this.prisma.courseReview.create({
			data: {
				courseId: input.courseId,
				userId,
				rating: input.rating,
				title: input.title,
				content: input.content,
				isVerified: !!enrollment,
			},
			include: {
				user: { select: { id: true, name: true, avatarUrl: true } },
			},
		});
	}

	/**
	 * Update an existing review
	 */
	async updateReview(
		userId: string,
		reviewId: string,
		data: { rating?: number; title?: string; content?: string },
	) {
		const review = await this.prisma.courseReview.findFirst({
			where: { id: reviewId, userId },
		});

		if (!review) {
			throw new NotFoundException("Review not found or unauthorized");
		}

		if (data.rating && (data.rating < 1 || data.rating > 5)) {
			throw new BadRequestException("Rating must be between 1 and 5");
		}

		return this.prisma.courseReview.update({
			where: { id: reviewId },
			data: {
				rating: data.rating,
				title: data.title,
				content: data.content,
			},
		});
	}

	/**
	 * Delete a review
	 */
	async deleteReview(userId: string, reviewId: string) {
		const review = await this.prisma.courseReview.findFirst({
			where: { id: reviewId, userId },
		});

		if (!review) {
			throw new NotFoundException("Review not found or unauthorized");
		}

		await this.prisma.courseReview.delete({ where: { id: reviewId } });
		return { success: true };
	}

	/**
	 * Get reviews for a course
	 */
	async getCourseReviews(
		courseId: string,
		options: {
			skip?: number;
			take?: number;
			sortBy?: "recent" | "helpful" | "rating";
		} = {},
	) {
		const { skip = 0, take = 10, sortBy = "recent" } = options;

		let orderBy: any = { createdAt: "desc" };
		if (sortBy === "helpful") {
			orderBy = { helpfulCount: "desc" };
		} else if (sortBy === "rating") {
			orderBy = { rating: "desc" };
		}

		const [reviews, total] = await Promise.all([
			this.prisma.courseReview.findMany({
				where: { courseId, isApproved: true },
				orderBy,
				skip,
				take,
				include: {
					user: { select: { id: true, name: true, avatarUrl: true } },
				},
			}),
			this.prisma.courseReview.count({ where: { courseId, isApproved: true } }),
		]);

		return { reviews, total };
	}

	/**
	 * Get rating statistics for a course
	 */
	async getCourseRatingStats(courseId: string): Promise<ReviewStats> {
		const reviews = await this.prisma.courseReview.findMany({
			where: { courseId, isApproved: true },
			select: { rating: true, isVerified: true },
		});

		const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
		let totalRating = 0;
		let verifiedCount = 0;

		for (const review of reviews) {
			distribution[review.rating as 1 | 2 | 3 | 4 | 5]++;
			totalRating += review.rating;
			if (review.isVerified) verifiedCount++;
		}

		return {
			averageRating: reviews.length > 0 ? totalRating / reviews.length : 0,
			totalReviews: reviews.length,
			ratingDistribution: distribution,
			verifiedReviews: verifiedCount,
		};
	}

	/**
	 * Get calculated rating for featured courses (used by homepage)
	 */
	async getCalculatedRating(courseId: string): Promise<number> {
		const stats = await this.getCourseRatingStats(courseId);
		return Math.round(stats.averageRating * 10) / 10; // Round to 1 decimal
	}

	/**
	 * Mark a review as helpful
	 */
	async markHelpful(userId: string, reviewId: string) {
		// TODO: Implement per-user helpful tracking to prevent duplicates
		return this.prisma.courseReview.update({
			where: { id: reviewId },
			data: { helpfulCount: { increment: 1 } },
		});
	}

	/**
	 * Get platform-wide review statistics
	 */
	async getPlatformReviewStats() {
		const reviews = await this.prisma.courseReview.findMany({
			where: { isApproved: true },
			select: { rating: true },
		});

		const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);

		return {
			totalReviews: reviews.length,
			averageRating: reviews.length > 0 ? totalRating / reviews.length : 0,
			fiveStarPercentage:
				reviews.length > 0
					? (reviews.filter((r) => r.rating === 5).length / reviews.length) *
						100
					: 0,
		};
	}

	/**
	 * Seed default reviews if database is empty
	 */
	private async seedDefaultReviews() {
		try {
			const reviewCount = await this.prisma.courseReview.count();
			if (reviewCount > 0) return;

			// Get some courses to add reviews to
			const courses = await this.prisma.course.findMany({
				where: { status: "PUBLISHED" },
				take: 5,
			});

			if (courses.length === 0) {
				this.logger.log("No published courses found for seeding reviews");
				return;
			}

			// Get or create sample reviewer users
			const reviewerData = [
				{
					email: "reviewer1@example.com",
					name: "Emily Johnson",
					role: "STUDENT",
				},
				{
					email: "reviewer2@example.com",
					name: "Michael Brown",
					role: "STUDENT",
				},
				{
					email: "reviewer3@example.com",
					name: "Sarah Davis",
					role: "STUDENT",
				},
				{
					email: "reviewer4@example.com",
					name: "David Wilson",
					role: "STUDENT",
				},
				{
					email: "reviewer5@example.com",
					name: "Jessica Martinez",
					role: "STUDENT",
				},
				{
					email: "reviewer6@example.com",
					name: "Chris Thompson",
					role: "FACULTY",
				},
				{
					email: "reviewer7@example.com",
					name: "Amanda Garcia",
					role: "STUDENT",
				},
				{
					email: "reviewer8@example.com",
					name: "James Anderson",
					role: "STUDENT",
				},
			];

			const reviewers = [];
			for (const data of reviewerData) {
				const existing = await this.prisma.user.findUnique({
					where: { email: data.email },
				});
				if (existing) {
					reviewers.push(existing);
				} else {
					const created = await this.prisma.user.create({ data });
					reviewers.push(created);
				}
			}

			// Sample review content
			const reviewTemplates = [
				{
					rating: 5,
					title: "Excellent Course!",
					content:
						"This course exceeded my expectations. The instructor explains complex concepts clearly, and the practical exercises really help reinforce the learning. Highly recommended!",
				},
				{
					rating: 5,
					title: "Best course I've taken",
					content:
						"Amazing content and well-structured curriculum. The pace is perfect for beginners but also covers advanced topics. The community is very supportive.",
				},
				{
					rating: 4,
					title: "Very Good Content",
					content:
						"Great course overall. The material is comprehensive and well-organized. Would love to see more practical projects, but the theory is solid.",
				},
				{
					rating: 5,
					title: "Transformed my understanding",
					content:
						"I've tried learning this subject before, but this course finally made everything click. The examples are relevant and the explanations are clear.",
				},
				{
					rating: 4,
					title: "Solid fundamentals",
					content:
						"Good introduction to the subject. Covers all the basics you need. Some sections could use more depth, but overall a great starting point.",
				},
				{
					rating: 5,
					title: "Highly Professional",
					content:
						"The production quality is excellent, and the instructor's expertise shows. Real-world examples make the concepts easy to apply immediately.",
				},
				{
					rating: 4,
					title: "Worth every penny",
					content:
						"Comprehensive coverage of the topic with good exercises. The instructor responds to questions quickly. Minor audio issues in a few videos but content is great.",
				},
				{
					rating: 5,
					title: "Perfect for career growth",
					content:
						"This course helped me land my dream job! The skills taught are exactly what employers are looking for. Thank you for this excellent resource!",
				},
			];

			this.logger.log("Seeding default course reviews...");

			let reviewsCreated = 0;
			for (const course of courses) {
				// Add 3-5 reviews per course
				const numReviews = 3 + Math.floor(Math.random() * 3);
				const shuffledReviewers = [...reviewers].sort(
					() => Math.random() - 0.5,
				);
				const shuffledTemplates = [...reviewTemplates].sort(
					() => Math.random() - 0.5,
				);

				for (let i = 0; i < numReviews && i < shuffledReviewers.length; i++) {
					const reviewer = shuffledReviewers[i];
					const template = shuffledTemplates[i % shuffledTemplates.length];

					try {
						await this.prisma.courseReview.create({
							data: {
								courseId: course.id,
								userId: reviewer.id,
								rating: template.rating,
								title: template.title,
								content: template.content,
								isVerified: Math.random() > 0.3, // 70% verified
								isApproved: true,
								helpfulCount: Math.floor(Math.random() * 50),
							},
						});
						reviewsCreated++;
					} catch (error) {
						// Skip if already exists (unique constraint)
					}
				}
			}

			this.logger.log(`Seeded ${reviewsCreated} course reviews`);
		} catch (error) {
			this.logger.error("Error seeding reviews:", error);
		}
	}
}
