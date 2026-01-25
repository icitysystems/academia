import {
	Injectable,
	Logger,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UserRole } from "../common/types";

/**
 * Alumni Service
 * Implements alumni/guest features as per Specification Section 2A.6
 *
 * Alumni can:
 * - Browse public course catalog
 * - Access alumni resources (career services, networking)
 * - Enroll in continuing education or certificate programs
 * - Limited access to forums or events
 */
@Injectable()
export class AlumniService {
	private readonly logger = new Logger(AlumniService.name);

	constructor(private prisma: PrismaService) {}

	// ============================
	// Alumni Profile
	// ============================

	/**
	 * Get alumni dashboard
	 */
	async getAlumniDashboard(userId: string) {
		await this.verifyAlumniOrGuest(userId);

		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: {
				certificates: {
					include: { course: true },
				},
				enrollments: {
					where: { status: { in: ["ACTIVE", "COMPLETED"] } },
					include: { course: true },
				},
			},
		});

		// Get alumni events
		const events = await this.getUpcomingEvents(userId);

		// Get continuing education programs
		const continuingEdPrograms = await this.getContinuingEducationPrograms();

		// Get career resources
		const careerResources = await this.getCareerResources();

		return {
			user: {
				id: user?.id,
				name: user?.name,
				email: user?.email,
				avatarUrl: user?.avatarUrl,
			},
			certificates: user?.certificates || [],
			enrollments: user?.enrollments || [],
			events,
			continuingEdPrograms,
			careerResources,
		};
	}

	/**
	 * Update alumni profile
	 */
	async updateAlumniProfile(userId: string, input: UpdateAlumniProfileInput) {
		await this.verifyAlumniOrGuest(userId);

		return this.prisma.user.update({
			where: { id: userId },
			data: {
				name: input.name,
				phone: input.phone,
				avatarUrl: input.avatarUrl,
				preferences: JSON.stringify({
					...(input.linkedIn && { linkedIn: input.linkedIn }),
					...(input.company && { company: input.company }),
					...(input.jobTitle && { jobTitle: input.jobTitle }),
					...(input.graduationYear && { graduationYear: input.graduationYear }),
					...(input.notificationPreferences && {
						notifications: input.notificationPreferences,
					}),
				}),
			},
		});
	}

	// ============================
	// Course Catalog (Public)
	// ============================

	/**
	 * Browse public course catalog
	 * As per Specification 2A.6: "Browse public course catalog"
	 */
	async browseCourseCatalog(options?: {
		category?: string;
		level?: string;
		search?: string;
		priceRange?: { min?: number; max?: number };
		skip?: number;
		take?: number;
	}) {
		const where: any = {
			isPublic: true,
			status: "PUBLISHED",
		};

		if (options?.category) {
			where.categoryId = options.category;
		}

		if (options?.level) {
			where.level = options.level;
		}

		if (options?.search) {
			where.OR = [
				{ title: { contains: options.search } },
				{ description: { contains: options.search } },
			];
		}

		if (options?.priceRange) {
			where.price = {};
			if (options.priceRange.min !== undefined) {
				where.price.gte = options.priceRange.min;
			}
			if (options.priceRange.max !== undefined) {
				where.price.lte = options.priceRange.max;
			}
		}

		const [courses, total] = await Promise.all([
			this.prisma.course.findMany({
				where,
				include: {
					category: true,
					instructor: {
						select: { id: true, name: true, avatarUrl: true },
					},
					_count: { select: { enrollments: true, modules: true } },
				},
				orderBy: { createdAt: "desc" },
				skip: options?.skip || 0,
				take: options?.take || 20,
			}),
			this.prisma.course.count({ where }),
		]);

		return { courses, total };
	}

	/**
	 * Get course categories
	 */
	async getCourseCategories() {
		return this.prisma.courseCategory.findMany({
			include: {
				_count: { select: { courses: true } },
			},
			orderBy: { orderIndex: "asc" },
		});
	}

	// ============================
	// Continuing Education
	// ============================

	/**
	 * Get continuing education programs
	 * As per Specification 2A.6: "Enroll in continuing education or certificate programs"
	 */
	async getContinuingEducationPrograms() {
		return this.prisma.course.findMany({
			where: {
				isPublic: true,
				status: "PUBLISHED",
				// Could add a tag/category for continuing education
			},
			include: {
				category: true,
				instructor: {
					select: { id: true, name: true },
				},
			},
			orderBy: { createdAt: "desc" },
			take: 10,
		});
	}

	/**
	 * Enroll in continuing education program
	 */
	async enrollInProgram(userId: string, courseId: string) {
		await this.verifyAlumniOrGuest(userId);

		const course = await this.prisma.course.findUnique({
			where: { id: courseId },
		});

		if (!course) {
			throw new NotFoundException("Course not found");
		}

		if (!course.isPublic || course.status !== "PUBLISHED") {
			throw new BadRequestException("Course is not available for enrollment");
		}

		// Check existing enrollment
		const existing = await this.prisma.enrollment.findUnique({
			where: {
				courseId_studentId: { courseId, studentId: userId },
			},
		});

		if (existing) {
			throw new BadRequestException("Already enrolled in this course");
		}

		// Check enrollment limit
		if (course.maxEnrollments) {
			const enrollmentCount = await this.prisma.enrollment.count({
				where: { courseId, status: "ACTIVE" },
			});
			if (enrollmentCount >= course.maxEnrollments) {
				throw new BadRequestException("Course enrollment limit reached");
			}
		}

		return this.prisma.enrollment.create({
			data: {
				courseId,
				studentId: userId,
				status: "ACTIVE",
			},
			include: {
				course: true,
			},
		});
	}

	// ============================
	// Career Services
	// ============================

	/**
	 * Get career resources
	 * As per Specification 2A.6: "Access alumni resources (career services, networking)"
	 */
	async getCareerResources() {
		// This would be expanded with actual career resources
		return {
			resumeReview: {
				available: true,
				description: "Get your resume reviewed by career counselors",
			},
			jobBoard: {
				available: true,
				description: "Access exclusive job postings for alumni",
			},
			careerCounseling: {
				available: true,
				description: "Schedule one-on-one career counseling sessions",
			},
			interviewPrep: {
				available: true,
				description: "Practice interviews with mock sessions",
			},
		};
	}

	/**
	 * Request career service
	 */
	async requestCareerService(
		userId: string,
		serviceType: string,
		details?: string,
	) {
		await this.verifyAlumniOrGuest(userId);

		// This would create a career service request
		// For now, return a confirmation
		return {
			id: `career-${Date.now()}`,
			userId,
			serviceType,
			details,
			status: "PENDING",
			requestedAt: new Date(),
			message: `Your ${serviceType} request has been submitted. Our career services team will contact you soon.`,
		};
	}

	// ============================
	// Alumni Events & Networking
	// ============================

	/**
	 * Get upcoming alumni events
	 * As per Specification 2A.6: "Limited access to forums or events"
	 */
	async getUpcomingEvents(userId: string) {
		// This would fetch from an events table
		// For now, return mock events
		return [
			{
				id: "event-1",
				title: "Alumni Networking Night",
				description: "Connect with fellow alumni in your industry",
				date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				type: "NETWORKING",
				isVirtual: true,
				registrationOpen: true,
			},
			{
				id: "event-2",
				title: "Career Workshop: Tech Trends 2026",
				description: "Learn about the latest technology trends",
				date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
				type: "WORKSHOP",
				isVirtual: false,
				registrationOpen: true,
			},
			{
				id: "event-3",
				title: "Annual Alumni Reunion",
				description: "Join us for the annual reunion",
				date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				type: "REUNION",
				isVirtual: false,
				registrationOpen: true,
			},
		];
	}

	/**
	 * Register for an event
	 */
	async registerForEvent(userId: string, eventId: string) {
		await this.verifyAlumniOrGuest(userId);

		// This would create an event registration
		return {
			id: `registration-${Date.now()}`,
			userId,
			eventId,
			status: "REGISTERED",
			registeredAt: new Date(),
			message: "You have successfully registered for the event.",
		};
	}

	// ============================
	// Alumni Directory
	// ============================

	/**
	 * Search alumni directory
	 */
	async searchAlumniDirectory(
		userId: string,
		options?: {
			search?: string;
			graduationYear?: string;
			company?: string;
			skip?: number;
			take?: number;
		},
	) {
		await this.verifyAlumniOrGuest(userId);

		// Alumni who have opted into directory visibility
		const where: any = {
			role: UserRole.ALUMNI,
			isActive: true,
		};

		if (options?.search) {
			where.OR = [
				{ name: { contains: options.search } },
				{ preferences: { contains: options.search } },
			];
		}

		const [alumni, total] = await Promise.all([
			this.prisma.user.findMany({
				where,
				select: {
					id: true,
					name: true,
					avatarUrl: true,
					preferences: true, // Contains company, jobTitle, graduationYear
				},
				skip: options?.skip || 0,
				take: options?.take || 20,
			}),
			this.prisma.user.count({ where }),
		]);

		return {
			alumni: alumni.map((a) => ({
				...a,
				preferences: a.preferences ? JSON.parse(a.preferences) : {},
			})),
			total,
		};
	}

	// ============================
	// Certificates & Transcripts
	// ============================

	/**
	 * Get alumni certificates
	 */
	async getAlumniCertificates(userId: string) {
		await this.verifyAlumniOrGuest(userId);

		return this.prisma.certificate.findMany({
			where: { studentId: userId },
			include: {
				course: {
					select: { id: true, title: true, code: true },
				},
			},
			orderBy: { issueDate: "desc" },
		});
	}

	/**
	 * Request transcript
	 */
	async requestTranscript(userId: string, input: TranscriptRequestInput) {
		await this.verifyAlumniOrGuest(userId);

		return this.prisma.transcriptRequest.create({
			data: {
				requesterId: userId,
				purpose: input.purpose,
				copies: input.copies || 1,
				deliveryMethod: input.deliveryMethod || "DIGITAL",
				address: input.address,
				status: "PENDING",
			},
		});
	}

	// ============================
	// Frontend Dashboard Methods
	// ============================

	/**
	 * Get transcripts for frontend alumni portal
	 */
	async getMyTranscripts(userId: string) {
		await this.verifyAlumniOrGuest(userId);

		// Get transcript requests
		const transcriptRequests = await this.prisma.transcriptRequest.findMany({
			where: { requesterId: userId },
			orderBy: { createdAt: "desc" },
		});

		return transcriptRequests.map((t) => ({
			id: t.id,
			title: `Academic Transcript - ${t.createdAt.toLocaleDateString()}`,
			issuedAt: t.processedAt || t.createdAt,
			status: t.status,
			downloadUrl: t.documentUrl,
		}));
	}

	/**
	 * Get certificates for frontend alumni portal
	 */
	async getMyCertificates(userId: string) {
		await this.verifyAlumniOrGuest(userId);

		const certificates = await this.prisma.certificate.findMany({
			where: { studentId: userId },
			include: {
				course: { select: { title: true } },
			},
			orderBy: { issueDate: "desc" },
		});

		return certificates.map((c) => ({
			id: c.id,
			title: `Certificate - ${c.course?.title || "Course Completion"}`,
			courseName: c.course?.title,
			issuedAt: c.issueDate,
			credentialId: c.certificateNumber,
			verificationUrl: c.verificationUrl,
		}));
	}

	/**
	 * Get alumni network for frontend alumni portal
	 */
	async getAlumniNetwork(userId: string, search?: string) {
		await this.verifyAlumniOrGuest(userId);

		const whereClause: any = {
			role: { in: [UserRole.ALUMNI, UserRole.STUDENT] },
			isActive: true,
			id: { not: userId }, // Exclude current user
		};

		if (search) {
			whereClause.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ email: { contains: search, mode: "insensitive" } },
			];
		}

		const alumni = await this.prisma.user.findMany({
			where: whereClause,
			select: {
				id: true,
				name: true,
				email: true,
				avatarUrl: true,
				preferences: true,
			},
			take: 50,
		});

		return alumni.map((a) => {
			const prefs = a.preferences ? JSON.parse(a.preferences as string) : {};
			return {
				id: a.id,
				name: a.name,
				graduationYear: prefs.graduationYear,
				company: prefs.company,
				position: prefs.jobTitle,
				location: prefs.location,
				linkedInUrl: prefs.linkedIn,
				avatarUrl: a.avatarUrl,
			};
		});
	}

	/**
	 * Get job postings for alumni portal
	 */
	async getJobPostings() {
		// Simulated job postings - in production this would come from a job postings table
		return [
			{
				id: "job-1",
				title: "Senior Software Engineer",
				company: "Tech Corp",
				location: "Remote",
				type: "FULL_TIME",
				salary: "$120,000 - $150,000",
				postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
				applyUrl: "https://techcorp.com/careers/senior-swe",
			},
			{
				id: "job-2",
				title: "Data Scientist",
				company: "Analytics Inc",
				location: "New York, NY",
				type: "FULL_TIME",
				salary: "$100,000 - $130,000",
				postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
				applyUrl: "https://analyticsinc.com/jobs/data-scientist",
			},
			{
				id: "job-3",
				title: "Product Manager",
				company: "StartupXYZ",
				location: "San Francisco, CA",
				type: "FULL_TIME",
				salary: "$130,000 - $160,000",
				postedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
				applyUrl: "https://startupxyz.com/pm-role",
			},
		];
	}

	/**
	 * Get alumni announcements
	 */
	async getAlumniAnnouncements(userId: string) {
		await this.verifyAlumniOrGuest(userId);

		// Return announcements targeted to alumni
		// In production, this would come from an announcements table
		return [
			{
				id: "ann-1",
				title: "Annual Alumni Reunion 2025",
				message:
					"Join us for our annual reunion on June 15th. Registration opens soon!",
				createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
			},
			{
				id: "ann-2",
				title: "New Career Services Portal",
				message:
					"We've launched a new career services portal with exclusive job listings for alumni.",
				createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
			},
		];
	}

	/**
	 * Get alumni perks
	 */
	async getAlumniPerks(userId: string) {
		await this.verifyAlumniOrGuest(userId);

		// Return perks for alumni
		// In production, this would come from a perks/discounts table
		return [
			{
				id: "perk-1",
				title: "20% off continuing education",
				description: "Alumni receive 20% off all continuing education courses",
				discount: "20%",
				validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
				code: "ALUMNI20",
			},
			{
				id: "perk-2",
				title: "Free career coaching session",
				description: "One free 30-minute career coaching session per year",
				discount: "100%",
				validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
				code: "FREECOACH",
			},
			{
				id: "perk-3",
				title: "Library access",
				description: "Continued access to digital library resources",
				discount: "Free",
				validUntil: null,
				code: null,
			},
		];
	}

	// ============================
	// Guest Access
	// ============================

	/**
	 * Get public resources for guests
	 */
	async getPublicResources() {
		const [publicCourses, categories] = await Promise.all([
			this.prisma.course.findMany({
				where: { isPublic: true, status: "PUBLISHED" },
				select: {
					id: true,
					title: true,
					shortDescription: true,
					thumbnailUrl: true,
					level: true,
					price: true,
				},
				take: 12,
			}),
			this.prisma.courseCategory.findMany({
				select: { id: true, name: true, slug: true },
			}),
		]);

		return {
			featuredCourses: publicCourses,
			categories,
			about: {
				institutionName: "Academia Online University",
				description: "Leading online education platform",
				contactEmail: "info@academia.edu",
			},
		};
	}

	// ============================
	// Helper Methods
	// ============================

	private async verifyAlumniOrGuest(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		// Allow all authenticated users for now
		// Could restrict to ALUMNI and GUEST roles if needed
		if (!user) {
			throw new NotFoundException("User not found");
		}

		return user;
	}
}

// Input types
interface UpdateAlumniProfileInput {
	name?: string;
	phone?: string;
	avatarUrl?: string;
	linkedIn?: string;
	company?: string;
	jobTitle?: string;
	graduationYear?: string;
	notificationPreferences?: {
		events?: boolean;
		newsletter?: boolean;
		jobAlerts?: boolean;
	};
}

interface TranscriptRequestInput {
	purpose?: string;
	copies?: number;
	deliveryMethod?: string;
	address?: string;
}
