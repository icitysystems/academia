/**
 * Common type definitions for the Academia system.
 * These replace Prisma enums for SQLite compatibility.
 * Updated as per Specification Section 2A - User Roles
 */

// User roles as per Specification Section 2A
export const UserRole = {
	STUDENT: "STUDENT",
	FACULTY: "FACULTY",
	ADMIN: "ADMIN",
	SUPPORT_STAFF: "SUPPORT_STAFF",
	PARENT: "PARENT",
	ALUMNI: "ALUMNI",
	GUEST: "GUEST",
	// Legacy aliases for backward compatibility
	TEACHER: "FACULTY",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Role action permissions as per Specification Section 2A
export const RolePermissions = {
	STUDENT: {
		courses: ["register", "view", "access_materials"],
		assignments: ["view", "submit"],
		grades: ["view"],
		payments: ["view", "pay"],
		profile: ["view", "update"],
		transcripts: ["request"],
		discussions: ["participate"],
		quizzes: ["take", "view_results"],
	},
	FACULTY: {
		courses: ["create", "edit", "publish", "view", "manage_roster"],
		assignments: ["create", "edit", "grade", "view"],
		grades: ["assign", "view", "update"],
		exams: [
			"create",
			"edit",
			"set_marking_guide",
			"train_model",
			"grade",
			"review",
		],
		students: ["view", "communicate", "track_progress"],
		analytics: ["view"],
		announcements: ["create", "edit"],
	},
	ADMIN: {
		users: ["create", "read", "update", "delete", "manage_roles"],
		courses: ["create", "read", "update", "delete", "approve"],
		programs: ["create", "read", "update", "delete"],
		finances: ["view", "manage", "generate_reports"],
		reports: ["generate", "view"],
		system: ["configure", "manage_settings"],
		compliance: ["manage", "audit"],
		content: ["moderate"],
	},
	SUPPORT_STAFF: {
		tickets: ["view", "create", "assign", "resolve", "close"],
		users: ["view", "troubleshoot"],
		system: ["monitor", "maintain"],
		logs: ["view"],
		security: ["monitor"],
	},
	PARENT: {
		student_progress: ["view"],
		grades: ["view"],
		payments: ["view", "pay"],
		notifications: ["receive"],
	},
	ALUMNI: {
		catalog: ["browse"],
		resources: ["access_alumni"],
		programs: ["enroll_continuing_ed"],
		events: ["view", "register"],
	},
	GUEST: {
		catalog: ["browse_public"],
		programs: ["view_public"],
	},
} as const;

// Confidence thresholds as per Specification Section 5A.9
export const ConfidenceThresholds = {
	HIGH: 0.95, // Auto-approve
	MEDIUM: 0.8, // Flag for quick review
	LOW: 0.8, // Require detailed teacher review (below this)
} as const;
export type ConfidenceThresholds =
	(typeof ConfidenceThresholds)[keyof typeof ConfidenceThresholds];

// Question types
export const QuestionType = {
	MCQ: "MCQ",
	SHORT_ANSWER: "SHORT_ANSWER",
	LONG_ANSWER: "LONG_ANSWER",
	TRUE_FALSE: "TRUE_FALSE",
	NUMERIC: "NUMERIC",
	DIAGRAM: "DIAGRAM",
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

// Sheet processing status
export const SheetStatus = {
	UPLOADED: "UPLOADED",
	PROCESSING: "PROCESSING",
	PROCESSED: "PROCESSED",
	ANNOTATED: "ANNOTATED",
	GRADED: "GRADED",
	REVIEWED: "REVIEWED",
	ERROR: "ERROR",
} as const;
export type SheetStatus = (typeof SheetStatus)[keyof typeof SheetStatus];

// Correctness levels for grading
export const Correctness = {
	CORRECT: "CORRECT",
	PARTIAL: "PARTIAL",
	INCORRECT: "INCORRECT",
	SKIPPED: "SKIPPED",
} as const;
export type Correctness = (typeof Correctness)[keyof typeof Correctness];

// Job status for async operations
export const JobStatus = {
	PENDING: "PENDING",
	RUNNING: "RUNNING",
	COMPLETED: "COMPLETED",
	FAILED: "FAILED",
	CANCELLED: "CANCELLED",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

// Print job status
export const PrintStatus = {
	QUEUED: "QUEUED",
	PRINTING: "PRINTING",
	COMPLETED: "COMPLETED",
	FAILED: "FAILED",
	CANCELLED: "CANCELLED",
} as const;
export type PrintStatus = (typeof PrintStatus)[keyof typeof PrintStatus];

// Grading review priority as per Specification Section 5A.5
export const ReviewPriority = {
	HIGH: "HIGH", // Low confidence grades
	MEDIUM: "MEDIUM", // Medium confidence grades
	LOW: "LOW", // High confidence grades (batch approve)
} as const;
export type ReviewPriority =
	(typeof ReviewPriority)[keyof typeof ReviewPriority];

// Exam paper status as per Specification Section 5A
export const ExamPaperStatus = {
	DRAFT: "DRAFT",
	QUESTIONS_ADDED: "QUESTIONS_ADDED",
	RESPONSES_SET: "RESPONSES_SET",
	MODERATION_READY: "MODERATION_READY",
	GRADING_ACTIVE: "GRADING_ACTIVE",
	COMPLETED: "COMPLETED",
} as const;
export type ExamPaperStatus =
	(typeof ExamPaperStatus)[keyof typeof ExamPaperStatus];

// Support ticket categories as per Specification Section 2A.4
export const TicketCategory = {
	TECHNICAL: "TECHNICAL",
	BILLING: "BILLING",
	ACADEMIC: "ACADEMIC",
	GENERAL: "GENERAL",
} as const;
export type TicketCategory =
	(typeof TicketCategory)[keyof typeof TicketCategory];

// Support ticket priorities
export const TicketPriority = {
	LOW: "LOW",
	MEDIUM: "MEDIUM",
	HIGH: "HIGH",
	URGENT: "URGENT",
} as const;
export type TicketPriority =
	(typeof TicketPriority)[keyof typeof TicketPriority];

// Support ticket status
export const TicketStatus = {
	OPEN: "OPEN",
	IN_PROGRESS: "IN_PROGRESS",
	RESOLVED: "RESOLVED",
	CLOSED: "CLOSED",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

// Payment types as per Specification Section 2A.1
export const PaymentType = {
	TUITION: "TUITION",
	FEE: "FEE",
	COURSE_PURCHASE: "COURSE_PURCHASE",
} as const;
export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType];

// Payment status
export const PaymentStatus = {
	PENDING: "PENDING",
	COMPLETED: "COMPLETED",
	FAILED: "FAILED",
	REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

// Transcript delivery methods
export const DeliveryMethod = {
	DIGITAL: "DIGITAL",
	MAIL: "MAIL",
} as const;
export type DeliveryMethod =
	(typeof DeliveryMethod)[keyof typeof DeliveryMethod];

// Transcript request status
export const TranscriptStatus = {
	PENDING: "PENDING",
	PROCESSING: "PROCESSING",
	COMPLETED: "COMPLETED",
	CANCELLED: "CANCELLED",
} as const;
export type TranscriptStatus =
	(typeof TranscriptStatus)[keyof typeof TranscriptStatus];
