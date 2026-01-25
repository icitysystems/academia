import { gql } from "@apollo/client";

// ============================================
// NOTIFICATION OPERATIONS - ADDITIONAL
// ============================================

export const GET_UNREAD_COUNT = gql`
	query GetUnreadCount {
		unreadNotificationCount
	}
`;

// ============================================
// LESSON PROGRESS OPERATIONS
// ============================================

export const GET_LESSON_PROGRESS = gql`
	query GetLessonProgress($courseId: ID!, $studentId: ID) {
		lessonProgress(courseId: $courseId, studentId: $studentId) {
			courseProgress {
				overallProgress
				completedLessons
				totalLessons
				totalTimeSpent
			}
			modules {
				moduleId
				moduleName
				completedLessons
				totalLessons
				overallProgress
				lessons {
					lessonId
					lessonTitle
					moduleId
					moduleName
					status
					progress
					timeSpent
					lastAccessed
					completedAt
					quizScore
				}
			}
		}
	}
`;

export const UPDATE_LESSON_PROGRESS = gql`
	mutation UpdateLessonProgress($input: UpdateLessonProgressInput!) {
		updateLessonProgress(input: $input) {
			lessonId
			status
			progress
			timeSpent
		}
	}
`;

export const MARK_LESSON_COMPLETE = gql`
	mutation MarkLessonComplete($lessonId: ID!) {
		markLessonComplete(lessonId: $lessonId) {
			lessonId
			status
			completedAt
		}
	}
`;

export const GET_COURSE_PROGRESS_REPORT = gql`
	query GetCourseProgressReport($courseId: ID!) {
		courseProgressReport(courseId: $courseId) {
			stats {
				avgProgress
				avgTimeSpent
				completionRate
				totalStudents
			}
			students {
				studentId
				studentName
				enrolledAt
				overallProgress
				timeSpent
				completedLessons
				totalLessons
				quizAverage
				lastActivity
			}
		}
	}
`;

// ============================================
// ASSIGNMENT OPERATIONS
// ============================================

export const GET_COURSE_ASSIGNMENTS = gql`
	query GetCourseAssignments($courseId: ID!) {
		assignments(courseId: $courseId) {
			id
			title
			description
			dueDate
			totalMarks
			status
			allowLate
			latePenalty
			maxFileSize
			allowedFileTypes
			lesson {
				id
				title
				module {
					id
					title
				}
			}
		}
	}
`;

export const GET_ASSIGNMENT = gql`
	query GetAssignment($id: ID!) {
		assignment(id: $id) {
			id
			title
			description
			instructions
			dueDate
			totalMarks
			allowLate
			latePenalty
			maxFileSize
			allowedFileTypes
			rubric
			status
			lesson {
				id
				title
				module {
					id
					title
					course {
						id
						title
					}
				}
			}
			submissions {
				id
				studentId
				submittedAt
				status
				score
				feedback
				isLate
			}
		}
	}
`;

export const GET_MY_SUBMISSIONS = gql`
	query GetMySubmissions($courseId: ID) {
		mySubmissions(courseId: $courseId) {
			id
			assignmentId
			assignment {
				id
				title
				dueDate
				totalMarks
			}
			submittedAt
			status
			score
			maxScore
			feedback
			isLate
			fileUrl
			fileName
		}
	}
`;

export const SUBMIT_ASSIGNMENT = gql`
	mutation SubmitAssignment($input: SubmitAssignmentInput!) {
		submitAssignment(input: $input) {
			id
			submittedAt
			status
			isLate
			fileUrl
			fileName
		}
	}
`;

export const UPLOAD_ASSIGNMENT_FILE = gql`
	mutation UploadAssignmentFile($assignmentId: ID!, $file: Upload!) {
		uploadAssignmentFile(assignmentId: $assignmentId, file: $file) {
			url
			fileName
			fileSize
		}
	}
`;

// ============================================
// DISCUSSION OPERATIONS
// ============================================

export const GET_COURSE_DISCUSSIONS = gql`
	query GetCourseDiscussions($courseId: ID!, $limit: Int, $offset: Int) {
		courseDiscussions(courseId: $courseId, limit: $limit, offset: $offset) {
			threads {
				id
				title
				content
				isPinned
				isLocked
				createdAt
				updatedAt
				author {
					id
					name
					avatarUrl
					role
				}
				_count {
					posts
				}
				lastPost {
					id
					createdAt
					author {
						id
						name
					}
				}
			}
			totalCount
			hasMore
		}
	}
`;

export const GET_DISCUSSION_THREAD = gql`
	query GetDiscussionThread($threadId: ID!) {
		discussionThread(id: $threadId) {
			id
			title
			content
			isPinned
			isLocked
			createdAt
			author {
				id
				name
				avatarUrl
				role
			}
			course {
				id
				title
			}
			posts {
				id
				content
				createdAt
				updatedAt
				author {
					id
					name
					avatarUrl
					role
				}
				parentId
				replies {
					id
					content
					createdAt
					author {
						id
						name
						avatarUrl
					}
				}
			}
		}
	}
`;

export const CREATE_DISCUSSION_THREAD = gql`
	mutation CreateDiscussionThread($input: CreateThreadInput!) {
		createDiscussionThread(input: $input) {
			id
			title
			content
			createdAt
		}
	}
`;

export const CREATE_DISCUSSION_POST = gql`
	mutation CreateDiscussionPost($input: CreatePostInput!) {
		createDiscussionPost(input: $input) {
			id
			content
			createdAt
			author {
				id
				name
				avatarUrl
			}
		}
	}
`;

export const TOGGLE_THREAD_PIN = gql`
	mutation ToggleThreadPin($threadId: ID!) {
		toggleThreadPin(threadId: $threadId) {
			id
			isPinned
		}
	}
`;

export const TOGGLE_THREAD_LOCK = gql`
	mutation ToggleThreadLock($threadId: ID!) {
		toggleThreadLock(threadId: $threadId) {
			id
			isLocked
		}
	}
`;

// ============================================
// QUIZ OPERATIONS
// ============================================

export const GET_AVAILABLE_QUIZZES = gql`
	query GetAvailableQuizzes($courseId: ID) {
		availableQuizzes(courseId: $courseId) {
			id
			title
			description
			type
			totalMarks
			duration
			maxAttempts
			availableFrom
			availableUntil
			status
			course {
				id
				title
			}
			_count {
				questions
			}
			myAttempts {
				id
				status
				score
				percentage
				submittedAt
			}
		}
	}
`;

export const GET_QUIZ_FOR_TAKING = gql`
	query GetQuizForTaking($quizId: ID!) {
		quizForTaking(quizId: $quizId) {
			id
			title
			description
			instructions
			duration
			totalMarks
			showResults
			showCorrectAnswers
			showFeedback
			shuffleQuestions
			shuffleOptions
			questions {
				id
				type
				questionText
				questionMedia
				options
				marks
				negativeMarks
				isRequired
				orderIndex
			}
		}
	}
`;

export const START_QUIZ_ATTEMPT = gql`
	mutation StartQuizAttempt($quizId: ID!) {
		startQuizAttempt(quizId: $quizId) {
			id
			startedAt
			status
			quiz {
				id
				title
				duration
			}
		}
	}
`;

export const SAVE_QUIZ_RESPONSE = gql`
	mutation SaveQuizResponse($input: SaveQuizResponseInput!) {
		saveQuizResponse(input: $input) {
			id
			response
			answeredAt
		}
	}
`;

export const SUBMIT_QUIZ_ATTEMPT = gql`
	mutation SubmitQuizAttempt($attemptId: ID!) {
		submitQuizAttempt(attemptId: $attemptId) {
			id
			status
			submittedAt
			score
			totalMarks
			percentage
			passed
			timeSpent
		}
	}
`;

export const GET_QUIZ_RESULT = gql`
	query GetQuizResult($attemptId: ID!) {
		quizResult(attemptId: $attemptId) {
			id
			score
			totalMarks
			percentage
			passed
			timeSpent
			submittedAt
			responses {
				id
				questionId
				response
				isCorrect
				marksAwarded
				feedback
				question {
					id
					questionText
					correctAnswer
					explanation
				}
			}
		}
	}
`;

// ============================================
// CERTIFICATE OPERATIONS
// ============================================

export const GET_MY_CERTIFICATES = gql`
	query GetMyCertificates {
		myCertificates {
			id
			certificateNumber
			issueDate
			expiryDate
			course {
				id
				title
				code
				instructor {
					id
					name
				}
			}
			grade
			completionDate
			status
			certificateUrl
			verificationUrl
		}
	}
`;

export const GET_CERTIFICATE = gql`
	query GetCertificate($id: ID!) {
		certificate(id: $id) {
			id
			certificateNumber
			issueDate
			expiryDate
			course {
				id
				title
				code
				description
				instructor {
					id
					name
					avatarUrl
				}
			}
			student {
				id
				name
			}
			grade
			completionDate
			status
			certificateUrl
			verificationUrl
			metadata
		}
	}
`;

export const VERIFY_CERTIFICATE = gql`
	query VerifyCertificate($certificateNumber: String!) {
		verifyCertificate(certificateNumber: $certificateNumber) {
			isValid
			certificate {
				id
				certificateNumber
				issueDate
				course {
					title
				}
				student {
					name
				}
				grade
			}
			message
		}
	}
`;

export const DOWNLOAD_CERTIFICATE = gql`
	mutation DownloadCertificate($certificateId: ID!) {
		downloadCertificate(certificateId: $certificateId) {
			downloadUrl
			expiresAt
		}
	}
`;

// ============================================
// NOTIFICATION OPERATIONS
// ============================================

export const GET_NOTIFICATIONS = gql`
	query GetNotifications($limit: Int, $types: [String!]) {
		notifications(limit: $limit, types: $types) {
			id
			type
			title
			message
			timestamp
			isRead
			link
			metadata
		}
	}
`;

export const MARK_NOTIFICATION_READ = gql`
	mutation MarkNotificationRead($notificationId: ID!) {
		markNotificationRead(notificationId: $notificationId) {
			id
			isRead
		}
	}
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
	mutation MarkAllNotificationsRead {
		markAllNotificationsRead {
			count
		}
	}
`;

export const NOTIFICATION_SUBSCRIPTION = gql`
	subscription OnNewNotification {
		newNotification {
			id
			type
			title
			message
			timestamp
			link
		}
	}
`;

// ============================================
// GRADEBOOK OPERATIONS
// ============================================

export const GET_STUDENT_GRADEBOOK = gql`
	query GetStudentGradebook($courseId: ID) {
		studentGradebook(courseId: $courseId) {
			courses {
				courseId
				courseTitle
				courseCode
				overallGrade
				letterGrade
				assignments {
					id
					title
					dueDate
					score
					maxScore
					weight
					status
				}
				quizzes {
					id
					title
					score
					maxScore
					percentage
					attemptDate
				}
				attendance {
					present
					total
					percentage
				}
			}
			overallGPA
			totalCredits
		}
	}
`;

export const GET_INSTRUCTOR_GRADEBOOK = gql`
	query GetInstructorGradebook($courseId: ID!) {
		instructorGradebook(courseId: $courseId) {
			students {
				studentId
				studentName
				email
				assignments {
					assignmentId
					score
					maxScore
					submittedAt
					status
				}
				quizzes {
					quizId
					score
					maxScore
					attemptDate
				}
				overallGrade
				letterGrade
			}
			courseStats {
				averageGrade
				highestGrade
				lowestGrade
				gradeDistribution {
					grade
					count
				}
			}
		}
	}
`;

export const UPDATE_GRADE = gql`
	mutation UpdateGrade($input: UpdateGradeInput!) {
		updateGrade(input: $input) {
			id
			score
			feedback
			gradedAt
		}
	}
`;

export const EXPORT_GRADEBOOK = gql`
	mutation ExportGradebook($courseId: ID!, $format: String!) {
		exportGradebook(courseId: $courseId, format: $format) {
			downloadUrl
			expiresAt
		}
	}
`;

// ============================================
// LIVE SESSION OPERATIONS
// ============================================

export const GET_UPCOMING_SESSIONS = gql`
	query GetUpcomingSessions($courseId: ID) {
		upcomingSessions(courseId: $courseId) {
			id
			title
			description
			scheduledAt
			duration
			status
			meetingUrl
			instructor {
				id
				name
				avatarUrl
			}
			course {
				id
				title
			}
			participantCount
			maxParticipants
			isRecorded
		}
	}
`;

export const GET_SESSION = gql`
	query GetSession($sessionId: ID!) {
		session(id: $sessionId) {
			id
			title
			description
			scheduledAt
			duration
			status
			meetingUrl
			accessCode
			instructor {
				id
				name
				avatarUrl
			}
			settings {
				allowChat
				allowScreenShare
				allowRecording
				requireApproval
			}
			participants {
				id
				name
				avatarUrl
				role
				joinedAt
			}
		}
	}
`;

export const CREATE_SESSION = gql`
	mutation CreateSession($input: CreateSessionInput!) {
		createSession(input: $input) {
			id
			title
			meetingUrl
			accessCode
		}
	}
`;

export const JOIN_SESSION = gql`
	mutation JoinSession($sessionId: ID!) {
		joinSession(sessionId: $sessionId) {
			token
			iceServers {
				urls
				username
				credential
			}
			roomId
		}
	}
`;

export const LEAVE_SESSION = gql`
	mutation LeaveSession($sessionId: ID!) {
		leaveSession(sessionId: $sessionId) {
			success
		}
	}
`;

export const END_SESSION = gql`
	mutation EndSession($sessionId: ID!) {
		endSession(sessionId: $sessionId) {
			id
			status
			endedAt
			recordingUrl
		}
	}
`;

// ============================================
// LEARNING ANALYTICS OPERATIONS
// ============================================

export const GET_STUDENT_ANALYTICS = gql`
	query GetStudentAnalytics($courseId: ID, $dateRange: DateRangeInput) {
		studentAnalytics(courseId: $courseId, dateRange: $dateRange) {
			overview {
				totalCourses
				completedCourses
				averageGrade
				totalTimeSpent
				streak
			}
			progressBySubject {
				subject
				progress
				grade
				timeSpent
			}
			activityTimeline {
				date
				lessonsCompleted
				quizzesAttempted
				assignmentsSubmitted
				timeSpent
			}
			strengths {
				topic
				score
				percentile
			}
			areasForImprovement {
				topic
				currentScore
				targetScore
				recommendedResources
			}
			goals {
				id
				title
				target
				current
				deadline
				status
			}
		}
	}
`;

export const GET_COURSE_ANALYTICS = gql`
	query GetCourseAnalytics($courseId: ID!) {
		courseAnalytics(courseId: $courseId) {
			enrollment {
				total
				active
				completed
				dropped
				trend {
					date
					count
				}
			}
			engagement {
				averageSessionTime
				averageCompletionRate
				contentViewsByType {
					type
					views
				}
				peakUsageTimes {
					hour
					count
				}
			}
			performance {
				averageGrade
				passRate
				gradeDistribution {
					range
					count
				}
				assessmentPerformance {
					assessmentId
					title
					averageScore
					completionRate
				}
			}
			atRiskStudents {
				studentId
				name
				email
				riskLevel
				factors
				lastActivity
			}
		}
	}
`;

export const GET_LEARNING_PATH_PROGRESS = gql`
	query GetLearningPathProgress($pathId: ID!) {
		learningPathProgress(pathId: $pathId) {
			path {
				id
				title
				description
				courses {
					id
					title
					orderIndex
				}
			}
			completedCourses
			currentCourse {
				id
				title
				progress
			}
			estimatedCompletion
			milestones {
				id
				title
				completed
				completedAt
			}
		}
	}
`;

// ============================================
// USER MANAGEMENT OPERATIONS
// ============================================

export const GET_USERS = gql`
	query GetUsers($filters: UserFiltersInput, $pagination: PaginationInput) {
		users(filters: $filters, pagination: $pagination) {
			users {
				id
				email
				name
				firstName
				lastName
				role
				isActive
				emailVerified
				createdAt
				lastLoginAt
				avatarUrl
			}
			totalCount
			hasMore
		}
	}
`;

export const GET_USER = gql`
	query GetUser($id: ID!) {
		user(id: $id) {
			id
			email
			name
			firstName
			lastName
			phone
			role
			isActive
			emailVerified
			createdAt
			lastLoginAt
			avatarUrl
			preferences
			notificationPreferences
		}
	}
`;

export const CREATE_USER = gql`
	mutation CreateUser($input: CreateUserInput!) {
		createUser(input: $input) {
			id
			email
			name
			role
		}
	}
`;

export const UPDATE_USER = gql`
	mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
		updateUser(id: $id, input: $input) {
			id
			name
			email
			role
			isActive
		}
	}
`;

export const DELETE_USER = gql`
	mutation DeleteUser($id: ID!) {
		deleteUser(id: $id) {
			success
			message
		}
	}
`;

export const TOGGLE_USER_STATUS = gql`
	mutation ToggleUserStatus($id: ID!) {
		toggleUserStatus(id: $id) {
			id
			isActive
		}
	}
`;

export const RESET_USER_PASSWORD = gql`
	mutation ResetUserPassword($id: ID!) {
		resetUserPassword(id: $id) {
			success
			message
		}
	}
`;

export const BULK_IMPORT_USERS = gql`
	mutation BulkImportUsers($file: Upload!, $role: String!) {
		bulkImportUsers(file: $file, role: $role) {
			imported
			failed
			errors {
				row
				message
			}
		}
	}
`;

// ============================================
// COURSE CONTENT OPERATIONS
// ============================================

export const GET_COURSE_CONTENT = gql`
	query GetCourseContent($courseId: ID!) {
		courseContent(courseId: $courseId) {
			modules {
				id
				title
				description
				orderIndex
				lessons {
					id
					title
					description
					contentType
					contentUrl
					contentText
					duration
					orderIndex
					isPublished
					isFree
				}
			}
			totalDuration
			totalLessons
		}
	}
`;

export const GET_LESSON_CONTENT = gql`
	query GetLessonContent($lessonId: ID!) {
		lessonContent(lessonId: $lessonId) {
			id
			title
			description
			contentType
			contentUrl
			contentText
			duration
			resources {
				id
				title
				type
				url
			}
			nextLesson {
				id
				title
			}
			previousLesson {
				id
				title
			}
		}
	}
`;

// ============================================
// PEDAGOGIC DOCUMENTS - SCHEMES OF WORK
// ============================================

export const GET_SCHEMES_OF_WORK = gql`
	query GetSchemesOfWork($classSubjectId: ID, $status: String) {
		schemesOfWork(classSubjectId: $classSubjectId, status: $status) {
			schemes {
				id
				syllabusId
				title
				term
				year
				totalWeeks
				weeklyHours
				status
				approvedAt
				generatedBy {
					id
					name
				}
				syllabus {
					id
					name
					classSubject {
						id
						class {
							name
						}
						subject {
							name
						}
					}
				}
				createdAt
				updatedAt
			}
			total
		}
	}
`;

export const GET_SCHEME_OF_WORK = gql`
	query GetSchemeOfWork($id: ID!) {
		schemeOfWork(id: $id) {
			id
			syllabusId
			title
			term
			year
			totalWeeks
			weeklyHours
			status
			weeks
			objectives
			resources
			assessments
			approvedAt
			approvedBy {
				id
				name
			}
			generatedBy {
				id
				name
			}
			createdAt
		}
	}
`;

export const GENERATE_SCHEME_OF_WORK = gql`
	mutation GenerateSchemeOfWork($input: GenerateSchemeInput!) {
		generateSchemeOfWork(input: $input) {
			id
			title
			term
			year
			totalWeeks
			status
			weeks
		}
	}
`;

export const UPDATE_SCHEME_OF_WORK = gql`
	mutation UpdateSchemeOfWork($id: ID!, $input: UpdateSchemeInput!) {
		updateSchemeOfWork(id: $id, input: $input) {
			id
			title
			weeks
			status
			updatedAt
		}
	}
`;

export const APPROVE_SCHEME_OF_WORK = gql`
	mutation ApproveSchemeOfWork($input: ApproveSchemeInput!) {
		approveSchemeOfWork(input: $input) {
			id
			status
			approvedAt
		}
	}
`;

export const DELETE_SCHEME_OF_WORK = gql`
	mutation DeleteSchemeOfWork($id: ID!) {
		deleteSchemeOfWork(id: $id)
	}
`;

// ============================================
// PEDAGOGIC DOCUMENTS - LESSON PLANS / PRESENTATIONS
// ============================================

export const GET_PRESENTATIONS = gql`
	query GetPresentations {
		myPresentations {
			id
			topic
			subject
			gradeLevel
			duration
			slideCount
			objectives
			status
			presentationUrl
			thumbnailUrl
			createdAt
		}
	}
`;

export const GENERATE_PRESENTATION = gql`
	mutation GeneratePresentation($input: GeneratePresentationInput!) {
		generatePresentation(input: $input) {
			id
			topic
			subject
			gradeLevel
			slideCount
			objectives
			slides
			status
			presentationUrl
		}
	}
`;

export const UPDATE_PRESENTATION = gql`
	mutation UpdatePresentation($id: ID!, $input: UpdatePresentationInput!) {
		updatePresentation(id: $id, input: $input) {
			id
			topic
			slides
			status
			updatedAt
		}
	}
`;

// ============================================
// PEDAGOGIC DOCUMENTS - SYLLABI
// ============================================

export const GET_SYLLABI = gql`
	query GetSyllabi($subjectId: ID, $classId: ID) {
		syllabi(subjectId: $subjectId, classId: $classId) {
			id
			name
			description
			classSubject {
				id
				class {
					id
					name
				}
				subject {
					id
					name
				}
			}
			totalTopics
			totalHours
			isTemplate
			templateSource
			createdAt
		}
	}
`;

export const GET_SYLLABUS = gql`
	query GetSyllabus($id: ID!) {
		syllabus(id: $id) {
			id
			name
			description
			documentUrl
			totalTopics
			totalHours
			isTemplate
			templateSource
			classSubject {
				id
				class {
					name
				}
				subject {
					name
				}
			}
			units {
				id
				title
				description
				orderIndex
				estimatedHours
				chapters {
					id
					title
					description
					orderIndex
					estimatedHours
					topics {
						id
						title
						description
						orderIndex
						estimatedHours
						learningOutcomes
					}
				}
			}
		}
	}
`;

export const CREATE_SYLLABUS = gql`
	mutation CreateSyllabus($input: CreateSyllabusInput!) {
		createSyllabus(input: $input) {
			id
			name
			description
			totalTopics
		}
	}
`;

export const IMPORT_SYLLABUS = gql`
	mutation ImportSyllabus(
		$classSubjectId: ID!
		$documentUrl: String!
		$parseOptions: JSON
	) {
		importSyllabus(
			classSubjectId: $classSubjectId
			documentUrl: $documentUrl
			parseOptions: $parseOptions
		) {
			id
			name
			totalTopics
			totalHours
			units {
				id
				title
			}
		}
	}
`;

export const UPDATE_SYLLABUS = gql`
	mutation UpdateSyllabus($id: ID!, $input: UpdateSyllabusInput!) {
		updateSyllabus(id: $id, input: $input) {
			id
			name
			description
			updatedAt
		}
	}
`;

export const DELETE_SYLLABUS = gql`
	mutation DeleteSyllabus($id: ID!) {
		deleteSyllabus(id: $id)
	}
`;

// ============================================
// PEDAGOGIC DOCUMENTS - AI LESSON PLANNER
// ============================================

export const GENERATE_LESSON_PLAN = gql`
	mutation GenerateLessonPlan($input: GenerateLessonPlanInput!) {
		generateLessonPlan(input: $input) {
			id
			topic
			subject
			gradeLevel
			duration
			objectives {
				type
				text
			}
			competencies
			phases {
				name
				duration
				activities
			}
			resources
			differentiation
			assessment
		}
	}
`;

export const GET_LESSON_PLANS = gql`
	query GetLessonPlans($subjectId: ID, $gradeLevel: String) {
		lessonPlans(subjectId: $subjectId, gradeLevel: $gradeLevel) {
			id
			topic
			subject
			gradeLevel
			duration
			status
			createdAt
			objectives {
				type
				text
			}
		}
	}
`;

export const SAVE_LESSON_PLAN = gql`
	mutation SaveLessonPlan($input: SaveLessonPlanInput!) {
		saveLessonPlan(input: $input) {
			id
			topic
			status
			savedAt
		}
	}
`;

export const EXPORT_LESSON_PLAN = gql`
	mutation ExportLessonPlan($id: ID!, $format: String!) {
		exportLessonPlan(id: $id, format: $format) {
			url
			fileName
		}
	}
`;
