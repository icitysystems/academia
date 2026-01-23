import { ObjectType, Field, Int, Float } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";

/**
 * Question Analysis - per-question difficulty and performance metrics
 * As per Specification 5A.6: "Question-level difficulty analysis"
 */
@ObjectType()
export class QuestionAnalysis {
	@Field()
	questionId: string;

	@Field(() => Int)
	questionNumber: number;

	@Field()
	questionType: string;

	@Field(() => Float)
	maxMarks: number;

	@Field(() => Float)
	averageScore: number;

	@Field(() => Float)
	averagePercentage: number;

	@Field()
	difficulty: string; // EASY, MODERATE, CHALLENGING, DIFFICULT

	@Field(() => Int)
	responseCount: number;

	@Field(() => Int)
	correctCount: number;

	@Field(() => Int)
	partialCount: number;

	@Field(() => Int)
	incorrectCount: number;
}

/**
 * Common Mistake - identified patterns in incorrect responses
 * As per Specification 5A.6: "Common mistakes and weak areas identification"
 */
@ObjectType()
export class CommonMistake {
	@Field()
	questionId: string;

	@Field(() => Int)
	questionNumber: number;

	@Field(() => Int)
	incorrectCount: number;

	@Field(() => [String])
	explanations: string[];
}

/**
 * Confidence Distribution - model performance metrics
 * As per Specification 5A.9: Confidence scoring system
 */
@ObjectType()
export class ConfidenceDistribution {
	@Field(() => Int)
	highConfidence: number; // >= 95%

	@Field(() => Int)
	mediumConfidence: number; // 80-95%

	@Field(() => Int)
	lowConfidence: number; // < 80%
}

/**
 * Grading Summary - comprehensive analytics dashboard data
 * As per Specification 5A.6: Reporting & Analytics Module
 */
@ObjectType()
export class GradingSummary {
	// Basic statistics
	@Field(() => Int)
	totalSubmissions: number;

	@Field(() => Int)
	gradedCount: number;

	@Field(() => Int)
	reviewedCount: number;

	@Field(() => Int)
	pendingReviewCount: number;

	// Score statistics
	@Field(() => Float, { nullable: true })
	averageScore?: number;

	@Field(() => Float, { nullable: true })
	highestScore?: number;

	@Field(() => Float, { nullable: true })
	lowestScore?: number;

	@Field(() => Float, { nullable: true })
	standardDeviation?: number;

	// Distributions
	@Field(() => GraphQLJSON)
	gradeDistribution: any;

	@Field(() => ConfidenceDistribution)
	confidenceDistribution: ConfidenceDistribution;

	// Question analysis
	@Field(() => [QuestionAnalysis])
	questionAnalysis: QuestionAnalysis[];

	// Common mistakes
	@Field(() => [CommonMistake])
	commonMistakes: CommonMistake[];

	// Timestamps
	@Field()
	generatedAt: Date;
}

/**
 * Review Queue - prioritized list of responses needing review
 * As per Specification 5A.5: "Smart prioritization (low-confidence scripts first)"
 */
@ObjectType()
export class ReviewQueuePriority {
	@Field(() => Int)
	high: number;

	@Field(() => Int)
	medium: number;

	@Field(() => Int)
	low: number;
}

@ObjectType()
export class ReviewQueue {
	@Field(() => [GraphQLJSON])
	responses: any[];

	@Field(() => GraphQLJSON)
	grouped: any;

	@Field(() => Int)
	totalNeedingReview: number;

	@Field(() => ReviewQueuePriority)
	byPriority: ReviewQueuePriority;
}

/**
 * Batch Approve Result
 */
@ObjectType()
export class BatchApproveResult {
	@Field(() => Int)
	approvedCount: number;

	@Field()
	message: string;
}
