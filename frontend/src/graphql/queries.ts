import { gql } from "@apollo/client";

// Auth
export const REGISTER = gql`
	mutation Register($input: RegisterInput!) {
		register(input: $input) {
			user {
				id
				email
				name
				role
			}
			token
		}
	}
`;

export const LOGIN = gql`
	mutation Login($input: LoginInput!) {
		login(input: $input) {
			user {
				id
				email
				name
				role
			}
			token
		}
	}
`;

export const ME = gql`
	query Me {
		me {
			id
			email
			name
			role
		}
	}
`;

// Templates
export const GET_TEMPLATES = gql`
	query Templates {
		templates {
			id
			name
			description
			version
			imageUrl
			thumbnailUrl
			createdAt
			_count {
				sheets
				annotations
			}
			regions {
				id
				label
				questionType
				points
			}
		}
	}
`;

export const GET_TEMPLATE = gql`
	query Template($id: ID!) {
		template(id: $id) {
			id
			name
			description
			version
			imageUrl
			answerKeyUrl
			regions {
				id
				label
				questionType
				points
				bboxX
				bboxY
				bboxWidth
				bboxHeight
				orderIndex
			}
			_count {
				sheets
				annotations
				models
			}
		}
	}
`;

export const CREATE_TEMPLATE = gql`
	mutation CreateTemplate($input: CreateTemplateInput!) {
		createTemplate(input: $input) {
			id
			name
			description
		}
	}
`;

export const UPDATE_TEMPLATE = gql`
	mutation UpdateTemplate($id: ID!, $input: UpdateTemplateInput!) {
		updateTemplate(id: $id, input: $input) {
			id
			name
			description
		}
	}
`;

export const ADD_TEMPLATE_REGION = gql`
	mutation AddTemplateRegion($templateId: ID!, $input: CreateRegionInput!) {
		addTemplateRegion(templateId: $templateId, input: $input) {
			id
			label
			questionType
			points
			bboxX
			bboxY
			bboxWidth
			bboxHeight
		}
	}
`;

// Sheets
export const GET_SHEETS = gql`
	query Sheets($templateId: ID, $status: String) {
		sheets(templateId: $templateId, status: $status) {
			id
			studentId
			studentName
			originalUrl
			thumbnailUrl
			status
			createdAt
			template {
				id
				name
			}
		}
	}
`;

export const UPLOAD_SHEET = gql`
	mutation UploadSheet($input: UploadSheetInput!) {
		uploadSheet(input: $input) {
			id
			status
		}
	}
`;

export const BATCH_UPLOAD_SHEETS = gql`
	mutation BatchUploadSheets($input: BatchUploadInput!) {
		batchUploadSheets(input: $input) {
			successful
			failed
			sheets {
				id
				studentId
				status
			}
		}
	}
`;

export const GET_SHEET = gql`
	query Sheet($id: ID!) {
		sheet(id: $id) {
			id
			studentId
			studentName
			originalUrl
			alignedUrl
			thumbnailUrl
			status
			extractedData
			template {
				id
				name
				imageUrl
				regions {
					id
					label
					questionType
					points
					bboxX
					bboxY
					bboxWidth
					bboxHeight
					orderIndex
				}
			}
			gradingResults {
				id
				regionId
				predictedCorrectness
				confidence
				assignedScore
				needsReview
				isReviewed
			}
		}
	}
`;

export const UPDATE_SHEET_STATUS = gql`
	mutation UpdateSheetStatus($id: ID!, $status: String!) {
		updateSheetStatus(id: $id, status: $status) {
			id
			status
		}
	}
`;

// Annotations
export const CREATE_ANNOTATION = gql`
	mutation CreateAnnotation($input: CreateAnnotationInput!) {
		createAnnotation(input: $input) {
			id
			questionLabels {
				id
				correctness
				score
			}
		}
	}
`;

export const GET_ANNOTATIONS = gql`
	query Annotations($templateId: ID) {
		annotations(templateId: $templateId) {
			id
			sheetId
			isTrainingData
			createdAt
			questionLabels {
				id
				correctness
				score
				region {
					label
				}
			}
		}
	}
`;

// Training
export const START_TRAINING = gql`
	mutation StartTraining($input: StartTrainingInput!) {
		startTraining(input: $input) {
			id
			status
		}
	}
`;

export const GET_TRAINING_SESSIONS = gql`
	query TrainingSessions($templateId: ID) {
		trainingSessions(templateId: $templateId) {
			id
			status
			metrics
			startedAt
			completedAt
			models {
				id
				version
				accuracy
				isActive
			}
		}
	}
`;

export const GET_TRAINING_STATS = gql`
	query TrainingStats($templateId: ID!) {
		trainingStats(templateId: $templateId) {
			totalSessions
			completedSessions
			trainingAnnotations
			activeModel {
				id
				version
				accuracy
			}
		}
	}
`;

// Grading
export const START_GRADING = gql`
	mutation StartGrading($input: StartGradingInput!) {
		startGrading(input: $input) {
			id
			status
			totalSheets
		}
	}
`;

export const GET_GRADING_JOBS = gql`
	query GradingJobs($templateId: ID) {
		gradingJobs(templateId: $templateId) {
			id
			status
			totalSheets
			processedSheets
			completedAt
			model {
				version
			}
		}
	}
`;

export const GET_GRADING_STATS = gql`
	query GradingStats($templateId: ID!) {
		gradingStats(templateId: $templateId) {
			totalJobs
			totalResults
			needsReview
			reviewed
			averageConfidence
		}
	}
`;

export const GET_RESULTS_NEEDING_REVIEW = gql`
	query ResultsNeedingReview($templateId: ID!) {
		resultsNeedingReview(templateId: $templateId) {
			id
			sheetId
			predictedCorrectness
			confidence
			assignedScore
			explanation
			region {
				label
			}
			sheet {
				studentName
			}
		}
	}
`;

export const REVIEW_GRADING_RESULT = gql`
	mutation ReviewGradingResult($input: ReviewResultInput!) {
		reviewGradingResult(input: $input) {
			id
			assignedScore
			isReviewed
			reviewedCorrectness
		}
	}
`;

export const BULK_REVIEW_RESULTS = gql`
	mutation BulkReviewResults($resultIds: [ID!]!, $action: String!) {
		bulkReviewResults(resultIds: $resultIds, action: $action) {
			updated
			failed
		}
	}
`;

// PDF
export const GENERATE_PDF = gql`
	mutation GeneratePDF($input: GeneratePDFInput!) {
		generatePDF(input: $input) {
			id
			pdfUrl
			totalScore
			maxScore
		}
	}
`;

// Reporting
export const GET_CLASS_SUMMARY = gql`
	query ClassSummary($templateId: ID!) {
		classSummary(templateId: $templateId) {
			templateName
			totalStudents
			averageScore
			highestScore
			lowestScore
			passRate
			gradeDistribution
		}
	}
`;

export const GET_QUESTION_ANALYSIS = gql`
	query QuestionAnalysis($templateId: ID!) {
		questionAnalysis(templateId: $templateId) {
			regionId
			label
			questionType
			totalAttempts
			correctCount
			partialCount
			incorrectCount
			difficultyIndex
		}
	}
`;

export const GET_SCORE_DISTRIBUTION = gql`
	query ScoreDistribution($templateId: ID!) {
		scoreDistribution(templateId: $templateId) {
			range
			count
		}
	}
`;

// ========================
// NEWSLETTER
// ========================

export const SUBSCRIBE_NEWSLETTER = gql`
	mutation SubscribeNewsletter($input: SubscribeNewsletterInput!) {
		subscribeNewsletter(input: $input) {
			id
			email
			isActive
		}
	}
`;

export const UNSUBSCRIBE_NEWSLETTER = gql`
	mutation UnsubscribeNewsletter($input: UnsubscribeNewsletterInput!) {
		unsubscribeNewsletter(input: $input) {
			id
			email
			isActive
		}
	}
`;

export const CHECK_NEWSLETTER_SUBSCRIPTION = gql`
	query CheckNewsletterSubscription($email: String!) {
		checkNewsletterSubscription(email: $email) {
			id
			email
			isActive
		}
	}
`;

// ========================
// DONATIONS
// ========================

export const CREATE_DONATION = gql`
	mutation CreateDonation($input: CreateDonationInput!) {
		createDonation(input: $input) {
			clientSecret
			paymentIntentId
			amount
			currency
		}
	}
`;

export const CONFIRM_DONATION = gql`
	mutation ConfirmDonation($paymentIntentId: String!) {
		confirmDonation(paymentIntentId: $paymentIntentId) {
			id
			status
			amount
		}
	}
`;

export const GET_PUBLIC_DONATIONS = gql`
	query PublicDonations($limit: Int) {
		publicDonations(limit: $limit) {
			id
			name
			amount
			message
			createdAt
		}
	}
`;

export const GET_DONATION_STATS = gql`
	query DonationStats {
		donationStats {
			totalDonations
			totalAmount
			donationsThisMonth
			amountThisMonth
		}
	}
`;

// ========================
// SUBSCRIPTION PLANS
// ========================

export const GET_SUBSCRIPTION_PLANS = gql`
	query SubscriptionPlans($includeInactive: Boolean) {
		subscriptionPlans(includeInactive: $includeInactive) {
			id
			name
			description
			tier
			priceMonthly
			priceYearly
			features
			maxTemplates
			maxSheetsPerMonth
			maxModelsPerTemplate
			maxStorageMB
			hasAdvancedAnalytics
			hasAPIAccess
			hasPrioritySupport
			hasCustomBranding
			hasTeamFeatures
			discountPercentYearly
			trialDays
			priority
			isActive
			isPublic
		}
	}
`;

export const GET_SUBSCRIPTION_PLAN = gql`
	query SubscriptionPlan($id: ID!) {
		subscriptionPlan(id: $id) {
			id
			name
			description
			tier
			priceMonthly
			priceYearly
			features
			maxTemplates
			maxSheetsPerMonth
			maxModelsPerTemplate
			maxStorageMB
			hasAdvancedAnalytics
			hasAPIAccess
			hasPrioritySupport
			hasCustomBranding
			hasTeamFeatures
			discountPercentYearly
			trialDays
		}
	}
`;

// ========================
// USER SUBSCRIPTIONS
// ========================

export const CREATE_SUBSCRIPTION = gql`
	mutation CreateSubscription($input: CreateSubscriptionInput!) {
		createSubscription(input: $input) {
			sessionId
			url
		}
	}
`;

export const CANCEL_SUBSCRIPTION = gql`
	mutation CancelSubscription($input: CancelSubscriptionInput!) {
		cancelSubscription(input: $input) {
			id
			status
			cancelAtPeriodEnd
		}
	}
`;

export const GET_MY_SUBSCRIPTION = gql`
	query MySubscription {
		mySubscription {
			id
			status
			billingCycle
			currentPeriodStart
			currentPeriodEnd
			cancelAtPeriodEnd
			plan {
				id
				name
				description
				tier
				priceMonthly
				priceYearly
				features
				maxTemplates
				maxSheetsPerMonth
				maxModelsPerTemplate
				maxStorageMB
				hasAdvancedAnalytics
				hasAPIAccess
				hasPrioritySupport
				hasCustomBranding
				hasTeamFeatures
			}
		}
	}
`;

export const GET_MY_SUBSCRIPTIONS = gql`
	query MySubscriptions {
		mySubscriptions {
			id
			status
			billingCycle
			currentPeriodStart
			currentPeriodEnd
			cancelAtPeriodEnd
			createdAt
			plan {
				id
				name
				tier
				priceMonthly
			}
		}
	}
`;

// ========================
// USER ENTITLEMENTS
// ========================

export const GET_MY_ENTITLEMENTS = gql`
	query MyEntitlements {
		myEntitlements {
			tier
			planName
			maxTemplates
			maxSheetsPerMonth
			maxModelsPerTemplate
			maxStorageMB
			hasAdvancedAnalytics
			hasAPIAccess
			hasPrioritySupport
			hasCustomBranding
			hasTeamFeatures
			currentPeriodEnd
			isTrialing
		}
	}
`;

// ========================
// ADMIN - SUBSCRIPTION MANAGEMENT
// ========================

export const GET_ALL_SUBSCRIPTION_PLANS = gql`
	query AllSubscriptionPlans {
		allSubscriptionPlans {
			id
			name
			description
			tier
			priceMonthly
			priceYearly
			stripeProductId
			features
			maxTemplates
			maxSheetsPerMonth
			maxModelsPerTemplate
			maxStorageMB
			hasAdvancedAnalytics
			hasAPIAccess
			hasPrioritySupport
			hasCustomBranding
			hasTeamFeatures
			discountPercentYearly
			trialDays
			priority
			isActive
			isPublic
			createdAt
			updatedAt
		}
	}
`;

export const CREATE_SUBSCRIPTION_PLAN = gql`
	mutation CreateSubscriptionPlan($input: CreateSubscriptionPlanInput!) {
		createSubscriptionPlan(input: $input) {
			id
			name
			tier
			priceMonthly
			priceYearly
		}
	}
`;

export const UPDATE_SUBSCRIPTION_PLAN = gql`
	mutation UpdateSubscriptionPlan(
		$id: ID!
		$input: UpdateSubscriptionPlanInput!
	) {
		updateSubscriptionPlan(id: $id, input: $input) {
			id
			name
			description
			tier
			priceMonthly
			priceYearly
			isActive
			isPublic
		}
	}
`;

export const DELETE_SUBSCRIPTION_PLAN = gql`
	mutation DeleteSubscriptionPlan($id: ID!) {
		deleteSubscriptionPlan(id: $id) {
			id
		}
	}
`;

export const GET_SUBSCRIPTION_STATS = gql`
	query SubscriptionStats {
		subscriptionStats {
			totalSubscriptions
			activeSubscriptions
			trialingSubscriptions
			canceledSubscriptions
			monthlyRecurringRevenue
			revenueByPlan {
				planName
				count
			}
		}
	}
`;

// Analytics & Dashboard Stats
export const GET_LEARNING_RESOURCE_STATS = gql`
	query LearningResourceStats {
		learningResourceStats
	}
`;

export const GET_STUDENT_ANALYTICS = gql`
	query StudentAnalytics($studentId: ID, $courseId: ID) {
		studentAnalytics(studentId: $studentId, courseId: $courseId)
	}
`;

export const GET_COURSE_ANALYTICS = gql`
	query CourseAnalytics($courseId: ID!) {
		courseAnalytics(courseId: $courseId)
	}
`;

export const GET_PLATFORM_ANALYTICS = gql`
	query PlatformAnalytics {
		platformAnalytics
	}
`;

export const GET_RECENT_ACTIVITY = gql`
	query RecentActivity($limit: Int) {
		recentActivity(limit: $limit)
	}
`;

export const LOG_ACTIVITY = gql`
	mutation LogActivity(
		$type: String!
		$entityType: String!
		$entityId: String!
		$title: String!
		$description: String
	) {
		logActivity(
			type: $type
			entityType: $entityType
			entityId: $entityId
			title: $title
			description: $description
		)
	}
`;

// Notifications
export const GET_NOTIFICATIONS = gql`
	query Notifications {
		notifications {
			id
			type
			title
			message
			isRead
			link
			metadata
			createdAt
		}
	}
`;

export const GET_UNREAD_NOTIFICATION_COUNT = gql`
	query UnreadNotificationCount {
		unreadNotificationCount
	}
`;

export const MARK_NOTIFICATION_AS_READ = gql`
	mutation MarkNotificationAsRead($id: ID!) {
		markNotificationAsRead(id: $id) {
			id
			isRead
		}
	}
`;

export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
	mutation MarkAllNotificationsAsRead {
		markAllNotificationsAsRead
	}
`;

export const DELETE_NOTIFICATION = gql`
	mutation DeleteNotification($id: ID!) {
		deleteNotification(id: $id)
	}
`;

// Live Sessions (WebRTC)
export const GET_LIVE_SESSIONS = gql`
	query LiveSessions($courseId: ID) {
		liveSessions(courseId: $courseId) {
			id
			title
			description
			status
			scheduledStart
			scheduledEnd
			actualStart
			actualEnd
			maxParticipants
			courseId
			hostId
			host {
				id
				name
			}
			_count {
				participants
			}
		}
	}
`;

export const GET_LIVE_SESSION = gql`
	query LiveSession($id: ID!) {
		liveSession(id: $id) {
			id
			title
			description
			status
			scheduledStart
			scheduledEnd
			actualStart
			actualEnd
			maxParticipants
			courseId
			course {
				id
				title
			}
			hostId
			host {
				id
				name
			}
			participants {
				id
				userId
				user {
					id
					name
				}
				role
				joinedAt
				leftAt
			}
		}
	}
`;

export const CREATE_LIVE_SESSION = gql`
	mutation CreateLiveSession($input: CreateLiveSessionInput!) {
		createLiveSession(input: $input) {
			id
			title
			status
			scheduledStart
			roomId
		}
	}
`;

export const JOIN_LIVE_SESSION = gql`
	mutation JoinLiveSession($sessionId: ID!) {
		joinLiveSession(sessionId: $sessionId) {
			participantId
			roomId
			token
			iceServers {
				urls
				username
				credential
			}
		}
	}
`;

export const LEAVE_LIVE_SESSION = gql`
	mutation LeaveLiveSession($sessionId: ID!) {
		leaveLiveSession(sessionId: $sessionId)
	}
`;

export const START_LIVE_SESSION = gql`
	mutation StartLiveSession($sessionId: ID!) {
		startLiveSession(sessionId: $sessionId) {
			id
			status
			actualStart
		}
	}
`;

export const END_LIVE_SESSION = gql`
	mutation EndLiveSession($sessionId: ID!) {
		endLiveSession(sessionId: $sessionId) {
			id
			status
			actualEnd
		}
	}
`;

// ============================================
// Homepage Queries
// ============================================

export const GET_HOMEPAGE_DATA = gql`
	query GetHomepageData {
		homepageData {
			featuredCourses {
				id
				title
				description
				instructor
				instructorAvatar
				rating
				students
				duration
				thumbnailUrl
				category
				price
				level
			}
			testimonials {
				id
				name
				role
				content
				avatarUrl
				rating
			}
			stats {
				totalStudents
				totalCourses
				totalInstructors
				completionRate
			}
		}
	}
`;

export const GET_FEATURED_COURSES = gql`
	query GetFeaturedCourses($limit: Int) {
		featuredCourses(limit: $limit) {
			id
			title
			description
			instructor
			instructorAvatar
			rating
			students
			duration
			thumbnailUrl
			category
			price
			level
		}
	}
`;

export const GET_TESTIMONIALS = gql`
	query GetTestimonials($limit: Int) {
		testimonials(limit: $limit) {
			id
			name
			role
			content
			avatarUrl
			rating
		}
	}
`;

export const GET_PLATFORM_STATS = gql`
	query GetPlatformStats {
		platformStats {
			totalStudents
			totalCourses
			totalInstructors
			completionRate
		}
	}
`;
