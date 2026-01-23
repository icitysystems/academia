import { gql } from "@apollo/client";

// ============================================
// School Queries & Mutations
// ============================================

export const GET_MY_SCHOOLS = gql`
	query GetMySchools {
		mySchools {
			id
			name
			location
			address
			phone
			email
			status
			teacherCount
			createdAt
			updatedAt
		}
	}
`;

export const GET_SCHOOL = gql`
	query GetSchool($id: ID!) {
		school(id: $id) {
			id
			name
			location
			address
			phone
			email
			status
			classes {
				id
				name
				gradeLevel
				section
				academicYear
				studentCount
				status
			}
			teacherCount
			createdAt
			updatedAt
		}
	}
`;

export const CREATE_SCHOOL = gql`
	mutation CreateSchool($input: CreateSchoolInput!) {
		createSchool(input: $input) {
			id
			name
			location
			status
			createdAt
		}
	}
`;

export const UPDATE_SCHOOL = gql`
	mutation UpdateSchool($id: ID!, $input: UpdateSchoolInput!) {
		updateSchool(id: $id, input: $input) {
			id
			name
			location
			address
			phone
			email
			status
			updatedAt
		}
	}
`;

export const DELETE_SCHOOL = gql`
	mutation DeleteSchool($id: ID!) {
		deleteSchool(id: $id)
	}
`;

// ============================================
// Class Queries & Mutations
// ============================================

export const GET_MY_CLASSES = gql`
	query GetMyClasses {
		myClasses {
			id
			name
			gradeLevel
			section
			academicYear
			term
			studentCount
			status
			school {
				id
				name
			}
			subjects {
				id
				subject {
					id
					name
				}
			}
			createdAt
		}
	}
`;

export const GET_CLASS = gql`
	query GetClass($id: ID!) {
		class(id: $id) {
			id
			name
			gradeLevel
			section
			academicYear
			term
			studentCount
			schedule
			status
			school {
				id
				name
				location
			}
			subjects {
				id
				subject {
					id
					name
					code
				}
				teacher {
					id
					name
				}
				totalHours
				weeklyHours
				startDate
				endDate
			}
			createdAt
			updatedAt
		}
	}
`;

export const CREATE_CLASS = gql`
	mutation CreateClass($input: CreateClassInput!) {
		createClass(input: $input) {
			id
			name
			gradeLevel
			section
			academicYear
			status
			school {
				id
				name
			}
			createdAt
		}
	}
`;

export const UPDATE_CLASS = gql`
	mutation UpdateClass($id: ID!, $input: UpdateClassInput!) {
		updateClass(id: $id, input: $input) {
			id
			name
			gradeLevel
			section
			academicYear
			term
			studentCount
			status
			updatedAt
		}
	}
`;

export const ARCHIVE_CLASS = gql`
	mutation ArchiveClass($id: ID!) {
		archiveClass(id: $id) {
			id
			status
			updatedAt
		}
	}
`;

// ============================================
// Subject Queries & Mutations
// ============================================

export const GET_SUBJECTS = gql`
	query GetSubjects($search: String) {
		subjects(search: $search) {
			id
			name
			code
			description
		}
	}
`;

export const CREATE_SUBJECT = gql`
	mutation CreateSubject($input: CreateSubjectInput!) {
		createSubject(input: $input) {
			id
			name
			code
			description
		}
	}
`;

export const ASSIGN_SUBJECT_TO_CLASS = gql`
	mutation AssignSubjectToClass($input: AssignSubjectInput!) {
		assignSubjectToClass(input: $input) {
			id
			class {
				id
				name
			}
			subject {
				id
				name
			}
			teacher {
				id
				name
			}
			totalHours
			weeklyHours
		}
	}
`;

// ============================================
// Lesson Queries & Mutations
// ============================================

export const GET_LESSONS = gql`
	query GetLessons(
		$classId: ID
		$classSubjectId: ID
		$teacherId: ID
		$dateFrom: DateTime
		$dateTo: DateTime
		$status: LessonStatus
	) {
		lessons(
			classId: $classId
			classSubjectId: $classSubjectId
			teacherId: $teacherId
			dateFrom: $dateFrom
			dateTo: $dateTo
			status: $status
		) {
			id
			date
			duration
			teachingMethod
			homeworkAssigned
			notes
			status
			class {
				id
				name
			}
			classSubject {
				id
				subject {
					id
					name
				}
			}
			topics {
				id
				title
			}
			createdAt
		}
	}
`;

export const GET_LESSON = gql`
	query GetLesson($id: ID!) {
		lesson(id: $id) {
			id
			date
			duration
			teachingMethod
			materialsUsed
			homeworkAssigned
			notes
			attendance
			status
			class {
				id
				name
				school {
					id
					name
				}
			}
			classSubject {
				id
				subject {
					id
					name
				}
			}
			topics {
				id
				title
				description
			}
			attachments {
				id
				fileName
				fileUrl
				fileType
				fileSize
				createdAt
			}
			createdAt
			updatedAt
		}
	}
`;

export const CREATE_LESSON = gql`
	mutation CreateLesson($input: CreateLessonInput!) {
		createLesson(input: $input) {
			id
			date
			duration
			teachingMethod
			status
			class {
				id
				name
			}
			classSubject {
				subject {
					id
					name
				}
			}
			topics {
				id
				title
			}
			createdAt
		}
	}
`;

export const UPDATE_LESSON = gql`
	mutation UpdateLesson($id: ID!, $input: UpdateLessonInput!) {
		updateLesson(id: $id, input: $input) {
			id
			date
			duration
			teachingMethod
			status
			updatedAt
		}
	}
`;

export const DELETE_LESSON = gql`
	mutation DeleteLesson($id: ID!) {
		deleteLesson(id: $id)
	}
`;

// ============================================
// Analytics & Dashboard
// ============================================

export const GET_DASHBOARD_SUMMARY = gql`
	query GetDashboardSummary {
		dashboardSummary {
			todayLessons {
				id
				date
				duration
				status
				class {
					id
					name
				}
				classSubject {
					subject {
						id
						name
					}
				}
			}
			upcomingLessons {
				id
				date
				duration
				status
				class {
					id
					name
				}
				classSubject {
					subject {
						id
						name
					}
				}
			}
			weekProgress
			alertsCount
			schoolsCount
			classesCount
			recentProgress {
				classSubjectId
				subjectName
				className
				totalTopics
				coveredTopics
				completionPercentage
				onTrack
			}
		}
	}
`;

export const GET_PROGRESS_SUMMARY = gql`
	query GetProgressSummary($classSubjectId: ID!) {
		progressSummary(classSubjectId: $classSubjectId) {
			classSubjectId
			subjectName
			className
			totalTopics
			coveredTopics
			completionPercentage
			totalHours
			hoursCompleted
			lessonsCount
			averageDuration
			onTrack
			projectedCompletionDate
		}
	}
`;

export const GET_LESSON_REPORT = gql`
	query GetLessonReport($input: GenerateReportInput!) {
		lessonReport(input: $input) {
			dateRange {
				start
				end
			}
			totalLessons
			totalHours
			classesTaught
			subjectsTaught
			topicsCovered
			methodDistribution {
				method
				count
				percentage
				totalHours
			}
			progressSummaries {
				classSubjectId
				subjectName
				className
				completionPercentage
				onTrack
			}
		}
	}
`;

// ============================================
// Additional Subject Queries & Mutations
// ============================================

export const GET_SUBJECT = gql`
	query GetSubject($id: ID!) {
		subject(id: $id) {
			id
			name
			code
			description
		}
	}
`;

export const UPDATE_SUBJECT = gql`
	mutation UpdateSubject($id: ID!, $input: UpdateSubjectInput!) {
		updateSubject(id: $id, input: $input) {
			id
			name
			code
			description
		}
	}
`;

export const REMOVE_SUBJECT_FROM_CLASS = gql`
	mutation RemoveSubjectFromClass($classSubjectId: ID!) {
		removeSubjectFromClass(classSubjectId: $classSubjectId)
	}
`;

export const DELETE_CLASS = gql`
	mutation DeleteClass($id: ID!) {
		deleteClass(id: $id)
	}
`;

// ============================================
// Syllabus Queries & Mutations
// ============================================

export const GET_SYLLABI = gql`
	query GetSyllabi($classSubjectId: ID) {
		syllabi(classSubjectId: $classSubjectId) {
			id
			title
			description
			totalHours
			completedHours
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
			units {
				id
				title
				description
				order
				topics {
					id
					title
					description
					duration
					status
					order
				}
			}
			createdAt
			updatedAt
		}
	}
`;

export const GET_SYLLABUS = gql`
	query GetSyllabus($id: ID!) {
		syllabus(id: $id) {
			id
			title
			description
			totalHours
			completedHours
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
			units {
				id
				title
				description
				order
				topics {
					id
					title
					description
					duration
					status
					order
				}
			}
			createdAt
			updatedAt
		}
	}
`;

export const CREATE_SYLLABUS = gql`
	mutation CreateSyllabus($input: CreateSyllabusInput!) {
		createSyllabus(input: $input) {
			id
			title
			description
			totalHours
			classSubject {
				id
			}
			createdAt
		}
	}
`;

export const UPDATE_SYLLABUS = gql`
	mutation UpdateSyllabus($id: ID!, $input: UpdateSyllabusInput!) {
		updateSyllabus(id: $id, input: $input) {
			id
			title
			description
			totalHours
			updatedAt
		}
	}
`;

export const DELETE_SYLLABUS = gql`
	mutation DeleteSyllabus($id: ID!) {
		deleteSyllabus(id: $id)
	}
`;

export const UPDATE_TOPIC_STATUS = gql`
	mutation UpdateTopicStatus($topicId: ID!, $status: TopicStatus!) {
		updateTopicStatus(topicId: $topicId, status: $status) {
			id
			status
		}
	}
`;

// ============================================
// Attachment Mutations
// ============================================

export const ADD_LESSON_ATTACHMENT = gql`
	mutation AddLessonAttachment($lessonId: ID!, $input: AddAttachmentInput!) {
		addLessonAttachment(lessonId: $lessonId, input: $input) {
			id
			fileName
			fileUrl
			fileType
			fileSize
			createdAt
		}
	}
`;

export const ADD_LESSON_LINK = gql`
	mutation AddLessonLink($lessonId: ID!, $url: String!, $title: String!) {
		addLessonLink(lessonId: $lessonId, url: $url, title: $title) {
			id
			fileName
			fileUrl
			fileType
			createdAt
		}
	}
`;

export const DELETE_LESSON_ATTACHMENT = gql`
	mutation DeleteLessonAttachment($id: ID!) {
		deleteLessonAttachment(id: $id)
	}
`;

// ============================================
// Report Export Mutations
// ============================================

export const EXPORT_LESSON_REPORT = gql`
	mutation ExportLessonReport(
		$input: GenerateReportInput!
		$format: ExportFormat!
	) {
		exportLessonReport(input: $input, format: $format)
	}
`;
