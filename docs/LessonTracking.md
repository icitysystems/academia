# Lesson Tracking Feature Specification

**Document Version:** 2.0  
**Date:** January 21, 2026  
**Status:** ✅ Substantially Implemented (~85%)

---

## Implementation Status Summary

> **Note:** This feature has been implemented. See [LessonTracking_Implementation_Evaluation.md](LessonTracking_Implementation_Evaluation.md) for detailed status and [LESSON_TRACKING_IMPLEMENTATION.md](../LESSON_TRACKING_IMPLEMENTATION.md) for implementation details.

| Component                 | Status      | Location                                  |
| ------------------------- | ----------- | ----------------------------------------- |
| Database Models (12)      | ✅ Complete | `backend/prisma/schema.prisma`            |
| Backend Services (6)      | ✅ Complete | `backend/src/lessons/services/`           |
| GraphQL API (~70 ops)     | ✅ Complete | `backend/src/lessons/lessons.resolver.ts` |
| Frontend Pages (7 groups) | ✅ Complete | `frontend/src/pages/LessonTracking/`      |
| Frontend Components       | 🟨 85%      | Missing: AttachmentUploader, charts       |

### Features Not Yet Implemented

| Feature                       | Spec Reference | Priority |
| ----------------------------- | -------------- | -------- |
| Syllabus Document Parsing     | FR-LT-2.1      | Medium   |
| Quick Lesson Entry            | FR-LT-3.2      | Medium   |
| Report Export (PDF/Excel/CSV) | FR-LT-6.3      | High     |
| Notification System           | FR-LT-7.x      | Medium   |
| Lesson Plan Sharing           | FR-LT-8.1      | Low      |
| Drag-Drop Attachments         | FR-LT-3.3      | High     |

---

## 1. Introduction

### 1.1 Purpose

This document specifies the **Lesson Tracking** feature for the Academia platform. The feature provides teachers with a centralized system to record lessons taught across multiple classes and schools, track syllabus coverage, monitor progress, and maintain consistency in teaching across different institutions.

### 1.2 Integration with Existing System

The Lesson Tracking module integrates seamlessly with the existing Academia ML-Powered Grading System, leveraging the current authentication, user management, and reporting infrastructure.

### 1.3 Objectives

- Enable teachers to log lessons taught for each class
- Provide visibility into syllabus coverage and work progress
- Support teachers working in multiple schools with a unified dashboard
- Facilitate reporting and analytics for better planning and accountability
- Enable school administrators to monitor teaching coverage and consistency

---

## 2. Stakeholders

| Stakeholder               | Role                   | Primary Needs                                                    |
| ------------------------- | ---------------------- | ---------------------------------------------------------------- |
| **Teachers**              | Primary Users          | Log lessons, track syllabus, view progress across schools        |
| **School Administrators** | Secondary Users        | Monitor coverage, generate reports, ensure curriculum completion |
| **Students**              | Indirect Beneficiaries | Benefit from structured, consistent lesson delivery              |
| **System Administrators** | Support                | Manage system configuration, data integrity                      |

---

## 3. Functional Requirements

### 3.1 School & Class Management ✅ IMPLEMENTED

**FR-LT-1.1: School Management** ✅

- Teachers shall be able to add multiple schools to their profile
- Each school entry includes: name, location, contact information
- Teachers can assign an active/inactive status to each school

**FR-LT-1.2: Class Management** ✅

- Teachers shall create and manage classes within each school
- Class attributes include:
  - Grade level (e.g., Grade 6, Grade 10)
  - Section/Division (e.g., A, B, Science Stream)
  - Academic year/term
  - Number of students
  - Meeting schedule (days and times)
- Classes can be linked to multiple subjects

**FR-LT-1.3: Subject Assignment**

- Teachers shall assign subjects to classes
- Subject attributes include:
  - Subject name (e.g., Mathematics, Physics, English)
  - Code (e.g., MATH10, PHY12)
  - Total curriculum hours
  - Weekly allocation

---

### 3.2 Syllabus Management

**FR-LT-2.1: Syllabus Creation & Upload**

- Teachers shall upload syllabus documents (PDF, DOCX, Excel)
- System shall parse structured syllabi and extract:
  - Units/Chapters
  - Topics
  - Learning objectives
  - Estimated duration
- Manual entry option for custom syllabus structure

**FR-LT-2.2: Syllabus Structure**

- Hierarchical organization: Subject → Unit → Chapter → Topic
- Each topic has:
  - Title
  - Description
  - Estimated duration (hours)
  - Prerequisites (optional)
  - Learning outcomes

**FR-LT-2.3: Syllabus Templates**

- System shall provide common curriculum templates (e.g., CBSE, ICSE, State Boards)
- Teachers can duplicate and customize templates
- Share templates with other teachers (optional)

---

### 3.3 Lesson Recording

**FR-LT-3.1: Lesson Entry Form**

- Teachers shall record lessons with the following fields:
  - **Date** (required)
  - **Class/Section** (required)
  - **Subject** (required)
  - **Topic(s) covered** (required, multi-select from syllabus)
  - **Duration** (in minutes/hours)
  - **Teaching method** (lecture, demonstration, group work, lab, activity, discussion, assessment)
  - **Materials used** (textbook, slides, videos, lab equipment)
  - **Homework assigned** (text field)
  - **Notes/Observations** (text area)
  - **Attendance** (optional: present/total)

**FR-LT-3.2: Quick Lesson Entry**

- One-click entry for recurring lessons
- Auto-populate recent lesson details with option to modify
- Bulk entry for multiple classes covering the same lesson

**FR-LT-3.3: Attachments**

- Teachers can attach supporting materials:
  - Documents (PDF, DOCX, PPT)
  - Links to external resources (YouTube, educational websites)
  - Images (diagrams, lab results)
  - Maximum 10 attachments per lesson, 50MB total

**FR-LT-3.4: Lesson Status**

- Status options: Planned, Completed, In Progress, Skipped, Rescheduled
- Teachers can mark lesson completion status
- Incomplete lessons trigger reminder notifications

---

### 3.4 Progress Tracking

**FR-LT-4.1: Syllabus Coverage Calculation**

- System shall automatically calculate percentage completion based on:
  - Topics covered vs. total topics
  - Hours completed vs. total curriculum hours
- Visual progress indicators (progress bars, pie charts)

**FR-LT-4.2: Progress Comparison**

- Compare progress across:
  - Different classes (same subject)
  - Different schools (same grade/subject)
  - Time periods (this month vs. last month)

**FR-LT-4.3: Pacing Analysis**

- System shall predict completion date based on current pace
- Alert if pace is ahead/behind schedule
- Recommend adjustments to meet curriculum deadlines

**FR-LT-4.4: Topic History**

- View complete history of when and how topics were taught
- Track revisions and repeated topics
- Identify topics needing reinforcement

---

### 3.5 Dashboard & Visualization

**FR-LT-5.1: Teacher Dashboard**

- Overview widgets:
  - Today's lessons
  - This week's progress summary
  - Upcoming planned lessons
  - Alerts and reminders
- Quick access to recent classes and schools
- Syllabus coverage heat map

**FR-LT-5.2: Class View**

- Individual class dashboard showing:
  - Current syllabus progress
  - Recent lessons taught
  - Upcoming topics
  - Performance analytics (if integrated with grading module)

**FR-LT-5.3: Subject View**

- Aggregated view across all classes for a subject
- Compare coverage across sections
- Identify common challenging topics

**FR-LT-5.4: School View**

- Overview of all classes within a school
- School-level progress metrics
- Resource utilization

---

### 3.6 Reporting & Analytics

**FR-LT-6.1: Standard Reports**

- **Coverage Report**: Syllabus completion percentage by class/subject
- **Lesson Log**: Detailed chronological log of all lessons
- **Pacing Report**: Current vs. expected progress
- **Teaching Methods Analysis**: Distribution of teaching approaches
- **Comparison Report**: Multi-class or multi-school comparison

**FR-LT-6.2: Custom Reports**

- Teachers can create custom reports with filters:
  - Date range
  - Schools/classes
  - Subjects
  - Topics
  - Teaching methods

**FR-LT-6.3: Export Options**

- Export reports as PDF, Excel, CSV
- Include charts and graphs in exports
- Email reports directly from the system

**FR-LT-6.4: Administrator Reports**

- School admins can view:
  - Teacher-wise coverage summary
  - Cross-teacher comparison
  - Resource allocation efficiency
  - Curriculum compliance status

---

### 3.7 Notifications & Reminders

**FR-LT-7.1: Lesson Reminders**

- Remind teachers to log lessons (configurable: daily, weekly)
- Notify about incomplete lesson entries
- Alert for unplanned time periods (gaps in lesson log)

**FR-LT-7.2: Progress Alerts**

- Warn if syllabus completion is behind schedule
- Celebrate milestone achievements (50%, 75%, 100% completion)
- Alert for topics skipped or pending

**FR-LT-7.3: Notification Channels**

- In-app notifications
- Email notifications (digest option)
- Push notifications (mobile app, future enhancement)

---

### 3.8 Collaboration & Sharing (Optional)

**FR-LT-8.1: Lesson Plan Sharing**

- Teachers can share lesson plans with colleagues
- Create a lesson plan library
- Rate and comment on shared plans

**FR-LT-8.2: School Integration**

- School admins can create school-wide curriculum templates
- Assign standardized syllabi to all teachers
- View aggregated school performance

---

## 4. Non-Functional Requirements

### 4.1 Usability

- **NFR-LT-1**: Simple, intuitive interface requiring minimal training
- **NFR-LT-2**: Lesson entry form completable in under 2 minutes
- **NFR-LT-3**: Responsive design for desktop, tablet, and mobile devices
- **NFR-LT-4**: Accessible to users with disabilities (WCAG 2.1 Level AA)

### 4.2 Performance

- **NFR-LT-5**: Lesson entry form loads in < 1 second
- **NFR-LT-6**: Save lesson operation completes in < 2 seconds
- **NFR-LT-7**: Dashboard renders in < 3 seconds
- **NFR-LT-8**: Reports generated in < 5 seconds for up to 500 lessons

### 4.3 Scalability

- **NFR-LT-9**: Support 10,000+ teachers simultaneously
- **NFR-LT-10**: Handle 100,000+ lesson entries per day
- **NFR-LT-11**: Store 5+ years of historical lesson data

### 4.4 Security & Privacy

- **NFR-LT-12**: Role-based access control (teachers see only their data; admins see school-wide data)
- **NFR-LT-13**: All data encrypted at rest and in transit (TLS 1.3)
- **NFR-LT-14**: Audit logging for all data modifications
- **NFR-LT-15**: GDPR compliance for user data
- **NFR-LT-16**: Secure file storage for attachments with virus scanning

### 4.5 Reliability & Availability

- **NFR-LT-17**: 99.9% uptime SLA
- **NFR-LT-18**: Data backup every 6 hours
- **NFR-LT-19**: Disaster recovery plan with RPO < 1 hour, RTO < 4 hours

### 4.6 Maintainability

- **NFR-LT-20**: Modular architecture for easy feature additions
- **NFR-LT-21**: Comprehensive API documentation
- **NFR-LT-22**: Automated testing coverage > 80%

---

## 5. Technical Architecture

### 5.1 Database Schema

#### 5.1.1 New Models

```prisma
// ============================================
// Lesson Tracking Module
// ============================================

model School {
  id          String   @id @default(cuid())
  name        String
  location    String?
  address     String?
  phone       String?
  email       String?
  status      String   @default("ACTIVE") // ACTIVE, INACTIVE
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  teachers    TeacherSchool[]
  classes     Class[]
}

model TeacherSchool {
  id          String   @id @default(cuid())
  teacherId   String
  schoolId    String
  isPrimary   Boolean  @default(false)
  createdAt   DateTime @default(now())

  teacher     User     @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  school      School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@unique([teacherId, schoolId])
}

model Class {
  id              String   @id @default(cuid())
  schoolId        String
  name            String   // e.g., "Grade 10-A"
  gradeLevel      String   // e.g., "Grade 10"
  section         String?  // e.g., "A", "Science Stream"
  academicYear    String   // e.g., "2025-2026"
  term            String?  // e.g., "Term 1", "Semester 1"
  studentCount    Int?
  schedule        String?  // JSON: days and times
  status          String   @default("ACTIVE") // ACTIVE, ARCHIVED
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  school          School          @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  classSubjects   ClassSubject[]
  lessons         Lesson[]
}

model Subject {
  id              String   @id @default(cuid())
  name            String   // e.g., "Mathematics"
  code            String?  // e.g., "MATH10"
  description     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  classSubjects   ClassSubject[]
  syllabi         Syllabus[]
}

model ClassSubject {
  id              String   @id @default(cuid())
  classId         String
  subjectId       String
  teacherId       String
  totalHours      Float?   // Total curriculum hours
  weeklyHours     Float?   // Weekly allocation
  startDate       DateTime?
  endDate         DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  class           Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  subject         Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  teacher         User     @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  syllabus        Syllabus?
  lessons         Lesson[]

  @@unique([classId, subjectId])
}

model Syllabus {
  id                String            @id @default(cuid())
  classSubjectId    String            @unique
  name              String
  description       String?
  documentUrl       String?           // Original uploaded syllabus
  isTemplate        Boolean           @default(false)
  templateSource    String?           // e.g., "CBSE", "ICSE"
  totalTopics       Int               @default(0)
  totalHours        Float             @default(0)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  // Relations
  classSubject      ClassSubject      @relation(fields: [classSubjectId], references: [id], onDelete: Cascade)
  subject           Subject           @relation(fields: [subjectId], references: [id])
  subjectId         String
  units             SyllabusUnit[]
}

model SyllabusUnit {
  id              String         @id @default(cuid())
  syllabusId      String
  title           String         // e.g., "Unit 1: Algebra"
  description     String?
  orderIndex      Int
  estimatedHours  Float?
  createdAt       DateTime       @default(now())

  // Relations
  syllabus        Syllabus       @relation(fields: [syllabusId], references: [id], onDelete: Cascade)
  chapters        SyllabusChapter[]
}

model SyllabusChapter {
  id              String         @id @default(cuid())
  unitId          String
  title           String         // e.g., "Chapter 1: Linear Equations"
  description     String?
  orderIndex      Int
  estimatedHours  Float?
  createdAt       DateTime       @default(now())

  // Relations
  unit            SyllabusUnit   @relation(fields: [unitId], references: [id], onDelete: Cascade)
  topics          SyllabusTopic[]
}

model SyllabusTopic {
  id              String         @id @default(cuid())
  chapterId       String
  title           String         // e.g., "Solving linear equations in one variable"
  description     String?
  orderIndex      Int
  estimatedHours  Float?
  learningOutcomes String?       // JSON array
  prerequisites   String?        // JSON array of topic IDs
  createdAt       DateTime       @default(now())

  // Relations
  chapter         SyllabusChapter @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  lessons         LessonTopic[]
}

model Lesson {
  id                String         @id @default(cuid())
  classId           String
  classSubjectId    String
  teacherId         String
  date              DateTime
  duration          Float          // in hours
  teachingMethod    String?        // LECTURE, DEMONSTRATION, GROUP_WORK, LAB, ACTIVITY, DISCUSSION, ASSESSMENT
  materialsUsed     String?        // JSON array
  homeworkAssigned  String?
  notes             String?
  attendance        String?        // JSON: {present: 25, total: 30}
  status            String         @default("COMPLETED") // PLANNED, COMPLETED, IN_PROGRESS, SKIPPED, RESCHEDULED
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  // Relations
  class             Class          @relation(fields: [classId], references: [id], onDelete: Cascade)
  classSubject      ClassSubject   @relation(fields: [classSubjectId], references: [id], onDelete: Cascade)
  teacher           User           @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  topics            LessonTopic[]
  attachments       LessonAttachment[]
}

model LessonTopic {
  id              String         @id @default(cuid())
  lessonId        String
  topicId         String
  createdAt       DateTime       @default(now())

  // Relations
  lesson          Lesson         @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  topic           SyllabusTopic  @relation(fields: [topicId], references: [id], onDelete: Cascade)

  @@unique([lessonId, topicId])
}

model LessonAttachment {
  id              String         @id @default(cuid())
  lessonId        String
  fileName        String
  fileUrl         String
  fileType        String         // PDF, DOCX, PPT, IMAGE, LINK
  fileSize        Int?           // in bytes
  createdAt       DateTime       @default(now())

  // Relations
  lesson          Lesson         @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}
```

### 5.2 GraphQL Schema Extensions

```graphql
# ============================================
# Lesson Tracking Types
# ============================================

type School {
	id: ID!
	name: String!
	location: String
	address: String
	phone: String
	email: String
	status: SchoolStatus!
	classes: [Class!]!
	teacherCount: Int!
	createdAt: DateTime!
	updatedAt: DateTime!
}

enum SchoolStatus {
	ACTIVE
	INACTIVE
}

type Class {
	id: ID!
	school: School!
	name: String!
	gradeLevel: String!
	section: String
	academicYear: String!
	term: String
	studentCount: Int
	schedule: JSON
	status: ClassStatus!
	subjects: [ClassSubject!]!
	lessons: [Lesson!]!
	createdAt: DateTime!
	updatedAt: DateTime!
}

enum ClassStatus {
	ACTIVE
	ARCHIVED
}

type Subject {
	id: ID!
	name: String!
	code: String
	description: String
	createdAt: DateTime!
	updatedAt: DateTime!
}

type ClassSubject {
	id: ID!
	class: Class!
	subject: Subject!
	teacher: User!
	totalHours: Float
	weeklyHours: Float
	startDate: DateTime
	endDate: DateTime
	syllabus: Syllabus
	progressPercentage: Float!
	hoursCompleted: Float!
	lessonsCount: Int!
	createdAt: DateTime!
	updatedAt: DateTime!
}

type Syllabus {
	id: ID!
	classSubject: ClassSubject!
	name: String!
	description: String
	documentUrl: String
	isTemplate: Boolean!
	templateSource: String
	totalTopics: Int!
	totalHours: Float!
	units: [SyllabusUnit!]!
	completionPercentage: Float!
	createdAt: DateTime!
	updatedAt: DateTime!
}

type SyllabusUnit {
	id: ID!
	syllabus: Syllabus!
	title: String!
	description: String
	orderIndex: Int!
	estimatedHours: Float
	chapters: [SyllabusChapter!]!
	completionPercentage: Float!
	createdAt: DateTime!
}

type SyllabusChapter {
	id: ID!
	unit: SyllabusUnit!
	title: String!
	description: String
	orderIndex: Int!
	estimatedHours: Float
	topics: [SyllabusTopic!]!
	completionPercentage: Float!
	createdAt: DateTime!
}

type SyllabusTopic {
	id: ID!
	chapter: SyllabusChapter!
	title: String!
	description: String
	orderIndex: Int!
	estimatedHours: Float
	learningOutcomes: [String!]
	prerequisites: [ID!]
	isCovered: Boolean!
	lastTaught: DateTime
	createdAt: DateTime!
}

type Lesson {
	id: ID!
	class: Class!
	classSubject: ClassSubject!
	teacher: User!
	date: DateTime!
	duration: Float!
	teachingMethod: TeachingMethod
	materialsUsed: [String!]
	homeworkAssigned: String
	notes: String
	attendance: AttendanceInfo
	status: LessonStatus!
	topics: [SyllabusTopic!]!
	attachments: [LessonAttachment!]!
	createdAt: DateTime!
	updatedAt: DateTime!
}

enum TeachingMethod {
	LECTURE
	DEMONSTRATION
	GROUP_WORK
	LAB
	ACTIVITY
	DISCUSSION
	ASSESSMENT
}

enum LessonStatus {
	PLANNED
	COMPLETED
	IN_PROGRESS
	SKIPPED
	RESCHEDULED
}

type AttendanceInfo {
	present: Int!
	total: Int!
	percentage: Float!
}

type LessonAttachment {
	id: ID!
	lesson: Lesson!
	fileName: String!
	fileUrl: String!
	fileType: AttachmentType!
	fileSize: Int
	createdAt: DateTime!
}

enum AttachmentType {
	PDF
	DOCX
	PPT
	IMAGE
	LINK
}

# ============================================
# Analytics & Reporting Types
# ============================================

type ProgressSummary {
	classSubjectId: ID!
	subjectName: String!
	className: String!
	totalTopics: Int!
	coveredTopics: Int!
	completionPercentage: Float!
	totalHours: Float!
	hoursCompleted: Float!
	lessonsCount: Int!
	averageDuration: Float!
	onTrack: Boolean!
	projectedCompletionDate: DateTime
}

type TeachingMethodDistribution {
	method: TeachingMethod!
	count: Int!
	percentage: Float!
	totalHours: Float!
}

type LessonReport {
	dateRange: DateRange!
	totalLessons: Int!
	totalHours: Float!
	classesTaught: Int!
	subjectsTaught: Int!
	topicsCovered: Int!
	methodDistribution: [TeachingMethodDistribution!]!
	progressSummaries: [ProgressSummary!]!
}

type DateRange {
	start: DateTime!
	end: DateTime!
}

# ============================================
# Query Extensions
# ============================================

extend type Query {
	# School Management
	schools(status: SchoolStatus): [School!]!
	school(id: ID!): School
	mySchools: [School!]!

	# Class Management
	classes(schoolId: ID, status: ClassStatus): [Class!]!
	class(id: ID!): Class
	myClasses: [Class!]!

	# Subject Management
	subjects(search: String): [Subject!]!
	subject(id: ID!): Subject

	# Class Subject
	classSubject(id: ID!): ClassSubject
	classSubjects(classId: ID, teacherId: ID): [ClassSubject!]!

	# Syllabus
	syllabus(id: ID!): Syllabus
	syllabusTemplates(templateSource: String): [Syllabus!]!

	# Lessons
	lesson(id: ID!): Lesson
	lessons(
		classId: ID
		classSubjectId: ID
		teacherId: ID
		dateFrom: DateTime
		dateTo: DateTime
		status: LessonStatus
	): [Lesson!]!

	# Analytics & Reports
	progressSummary(classSubjectId: ID!): ProgressSummary!
	lessonReport(
		teacherId: ID
		schoolId: ID
		classId: ID
		subjectId: ID
		dateFrom: DateTime!
		dateTo: DateTime!
	): LessonReport!

	# Dashboard
	dashboardSummary: DashboardSummary!
}

type DashboardSummary {
	todayLessons: [Lesson!]!
	upcomingLessons: [Lesson!]!
	weekProgress: Float!
	alertsCount: Int!
	schoolsCount: Int!
	classesCount: Int!
	recentProgress: [ProgressSummary!]!
}

# ============================================
# Mutation Extensions
# ============================================

extend type Mutation {
	# School Management
	createSchool(input: CreateSchoolInput!): School!
	updateSchool(id: ID!, input: UpdateSchoolInput!): School!
	deleteSchool(id: ID!): Boolean!
	addTeacherToSchool(
		schoolId: ID!
		teacherId: ID!
		isPrimary: Boolean
	): Boolean!
	removeTeacherFromSchool(schoolId: ID!, teacherId: ID!): Boolean!

	# Class Management
	createClass(input: CreateClassInput!): Class!
	updateClass(id: ID!, input: UpdateClassInput!): Class!
	deleteClass(id: ID!): Boolean!
	archiveClass(id: ID!): Class!

	# Subject Management
	createSubject(input: CreateSubjectInput!): Subject!
	updateSubject(id: ID!, input: UpdateSubjectInput!): Subject!

	# Class Subject
	assignSubjectToClass(input: AssignSubjectInput!): ClassSubject!
	updateClassSubject(id: ID!, input: UpdateClassSubjectInput!): ClassSubject!
	removeSubjectFromClass(id: ID!): Boolean!

	# Syllabus Management
	createSyllabus(input: CreateSyllabusInput!): Syllabus!
	updateSyllabus(id: ID!, input: UpdateSyllabusInput!): Syllabus!
	uploadSyllabusDocument(classSubjectId: ID!, file: Upload!): Syllabus!
	importSyllabusTemplate(classSubjectId: ID!, templateId: ID!): Syllabus!

	# Syllabus Structure
	createSyllabusUnit(input: CreateSyllabusUnitInput!): SyllabusUnit!
	createSyllabusChapter(input: CreateSyllabusChapterInput!): SyllabusChapter!
	createSyllabusTopic(input: CreateSyllabusTopicInput!): SyllabusTopic!

	# Lesson Management
	createLesson(input: CreateLessonInput!): Lesson!
	updateLesson(id: ID!, input: UpdateLessonInput!): Lesson!
	deleteLesson(id: ID!): Boolean!
	bulkCreateLessons(input: [CreateLessonInput!]!): [Lesson!]!

	# Lesson Attachments
	addLessonAttachment(lessonId: ID!, file: Upload!): LessonAttachment!
	addLessonLink(lessonId: ID!, url: String!, title: String!): LessonAttachment!
	deleteLessonAttachment(id: ID!): Boolean!

	# Reports
	generateReport(input: GenerateReportInput!): Report!
	exportReport(reportId: ID!, format: ExportFormat!): String!
}

# Input Types (representative samples)
input CreateSchoolInput {
	name: String!
	location: String
	address: String
	phone: String
	email: String
}

input CreateClassInput {
	schoolId: ID!
	name: String!
	gradeLevel: String!
	section: String
	academicYear: String!
	term: String
	studentCount: Int
	schedule: JSON
}

input CreateLessonInput {
	classId: ID!
	classSubjectId: ID!
	date: DateTime!
	duration: Float!
	teachingMethod: TeachingMethod
	materialsUsed: [String!]
	homeworkAssigned: String
	notes: String
	attendance: AttendanceInput
	status: LessonStatus
	topicIds: [ID!]!
}

input AttendanceInput {
	present: Int!
	total: Int!
}

enum ExportFormat {
	PDF
	EXCEL
	CSV
}
```

### 5.3 Backend Module Structure

```
backend/src/
  lessons/
    lessons.module.ts
    lessons.resolver.ts
    lessons.service.ts
    dto/
      create-school.input.ts
      create-class.input.ts
      create-lesson.input.ts
      lesson-filters.input.ts
      ...
    models/
      school.model.ts
      class.model.ts
      lesson.model.ts
      syllabus.model.ts
      ...
    services/
      schools.service.ts
      classes.service.ts
      syllabi.service.ts
      analytics.service.ts
      reports.service.ts
```

### 5.4 Frontend Components

```
frontend/src/
  pages/
    LessonTracking/
      Dashboard.tsx
      Schools/
        SchoolsList.tsx
        SchoolForm.tsx
        SchoolDetails.tsx
      Classes/
        ClassesList.tsx
        ClassForm.tsx
        ClassDetails.tsx
      Lessons/
        LessonsList.tsx
        LessonForm.tsx
        LessonQuickEntry.tsx
        LessonDetails.tsx
      Syllabus/
        SyllabusEditor.tsx
        SyllabusTemplates.tsx
        SyllabusProgress.tsx
      Reports/
        ReportBuilder.tsx
        ReportViewer.tsx
        ReportExport.tsx
      Analytics/
        ProgressCharts.tsx
        TeachingMethodsChart.tsx
        PacingAnalysis.tsx
  components/
    LessonTracking/
      SchoolCard.tsx
      ClassCard.tsx
      LessonCard.tsx
      ProgressBar.tsx
      SyllabusTree.tsx
      TopicSelector.tsx
      AttachmentUploader.tsx
```

---

## 6. API Endpoints (REST Alternative)

For systems preferring REST over GraphQL:

```
POST   /api/schools
GET    /api/schools
GET    /api/schools/:id
PUT    /api/schools/:id
DELETE /api/schools/:id

POST   /api/classes
GET    /api/classes?schoolId=...&status=...
GET    /api/classes/:id
PUT    /api/classes/:id
DELETE /api/classes/:id

POST   /api/class-subjects
GET    /api/class-subjects?classId=...
PUT    /api/class-subjects/:id

POST   /api/syllabi
GET    /api/syllabi/:id
PUT    /api/syllabi/:id
POST   /api/syllabi/upload
GET    /api/syllabi/templates

POST   /api/lessons
GET    /api/lessons?classId=...&dateFrom=...&dateTo=...
GET    /api/lessons/:id
PUT    /api/lessons/:id
DELETE /api/lessons/:id

POST   /api/lessons/:id/attachments
DELETE /api/lessons/attachments/:id

GET    /api/analytics/progress/:classSubjectId
GET    /api/analytics/dashboard
POST   /api/reports/generate
GET    /api/reports/:id/export?format=pdf
```

---

## 7. User Interface Specifications

### 7.1 Dashboard Layout

- Top navigation: Schools, Classes, Lessons, Reports
- Left sidebar: Quick filters (today, this week, this month)
- Main content area:
  - Today's lessons (cards)
  - Progress summary widgets
  - Alerts panel
  - Quick action buttons

### 7.2 Lesson Entry Form

- Responsive layout: single column on mobile, two columns on desktop
- Auto-complete for class and subject selection
- Date picker with calendar view
- Topic selector with hierarchical tree view
- Drag-and-drop attachment upload
- Save and Add Another button for quick entry

### 7.3 Progress Visualization

- Progress bars for syllabus completion
- Color-coded status (green: on track, yellow: slight delay, red: behind schedule)
- Pie charts for teaching methods distribution
- Line graphs for pacing trends

### 7.4 Mobile Considerations

- Simplified lesson entry form on mobile
- Swipe gestures for navigation
- Offline mode: cache recent data, sync when online
- Camera integration for capturing lesson materials

---

## 8. Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-3)

- Database schema implementation
- Basic CRUD operations for schools, classes, subjects
- User authentication integration
- Basic UI scaffolding

### Phase 2: Syllabus & Lesson Management (Weeks 4-6)

- Syllabus creation and management
- Lesson entry forms
- Topic selection and tracking
- Basic progress calculation

### Phase 3: Analytics & Reporting (Weeks 7-8)

- Dashboard implementation
- Progress tracking algorithms
- Report generation
- Export functionality

### Phase 4: Advanced Features (Weeks 9-10)

- Notifications system
- Advanced analytics
- Bulk operations
- Performance optimization

### Phase 5: Testing & Refinement (Weeks 11-12)

- Comprehensive testing
- Bug fixes
- UI/UX improvements
- Documentation

---

## 9. Testing Strategy

### 9.1 Unit Tests

- Service layer: business logic, calculations
- Resolvers/Controllers: request handling
- Utilities: helper functions

### 9.2 Integration Tests

- API endpoints
- Database operations
- GraphQL queries and mutations

### 9.3 End-to-End Tests

- User workflows: create school → add class → log lesson → view progress
- Report generation and export
- Multi-school scenarios

### 9.4 Performance Tests

- Load testing: 1000 concurrent users
- Stress testing: peak usage scenarios
- Database query optimization

---

## 10. Security Considerations

### 10.1 Authentication & Authorization

- Leverage existing JWT-based auth system
- Role-based access: teachers see only their data, admins see school-wide
- School-level data isolation

### 10.2 Data Validation

- Input sanitization for all user inputs
- File upload validation (type, size, virus scan)
- SQL injection prevention (Prisma ORM)

### 10.3 Privacy

- GDPR compliance: data export, deletion rights
- Anonymous usage analytics (opt-in)
- Secure file storage with access controls

---

## 11. Integration Points

### 11.1 Existing System Integration

- **User Module**: Leverage existing user authentication and profiles
- **Reporting Module**: Extend existing reporting infrastructure
- **Storage Module**: Use existing file storage for attachments
- **Queue Module**: Background job processing for report generation

### 11.2 Future Integrations

- **Grading Module**: Link lessons to assessments and grading data
- **ML Module**: Predict optimal pacing, identify at-risk topics
- **Payments Module**: Premium features for advanced analytics
- **School Management Systems**: Import student lists, sync calendars

---

## 12. Success Metrics

### 12.1 Adoption Metrics

- Number of active teachers
- Lessons logged per day
- Schools onboarded
- Daily/Monthly active users

### 12.2 Engagement Metrics

- Average lessons per teacher per week
- Syllabus completion rates
- Report generation frequency
- Mobile vs. desktop usage

### 12.3 Performance Metrics

- Page load times
- API response times
- Report generation time
- System uptime

### 12.4 Quality Metrics

- Bug report frequency
- User satisfaction score (NPS)
- Feature adoption rates
- Support ticket volume

---

## 13. Future Enhancements

### 13.1 AI-Powered Features

- **Smart Pacing**: ML-based predictions for optimal lesson scheduling
- **Topic Recommendations**: Suggest topics based on student performance (if grading data available)
- **Anomaly Detection**: Identify unusual patterns (missed topics, rushed coverage)

### 13.2 Collaboration Features

- **Lesson Plan Library**: Share and rate lesson plans
- **Teacher Communities**: Subject-wise forums
- **Peer Observations**: Record and share teaching observations

### 13.3 Student Engagement

- **Student Portal**: View upcoming topics, homework
- **Parent Access**: Monitor child's curriculum progress
- **Feedback Loop**: Student feedback on lesson clarity

### 13.4 Advanced Analytics

- **Comparative Analysis**: Benchmark against similar schools
- **Resource Optimization**: Identify underutilized resources
- **Predictive Analytics**: Forecast exam readiness based on coverage

### 13.5 Mobile App

- Native iOS and Android apps
- Offline-first architecture
- Push notifications
- Voice-to-text for quick lesson notes

---

## 14. Dependencies & Prerequisites

### 14.1 Technical Dependencies

- Existing Academia platform (authentication, database, storage)
- Prisma ORM for database migrations
- GraphQL server (Apollo/NestJS)
- React frontend with state management (Redux/Context API)
- File upload handling (multipart/form-data)

### 14.2 Infrastructure

- Database: PostgreSQL (production) / SQLite (development)
- File storage: AWS S3 or Azure Blob Storage
- Background jobs: Bull Queue or AWS SQS
- CDN for static assets

### 14.3 Third-Party Services

- Email service (SendGrid, AWS SES) for notifications
- PDF generation library (PDFKit, Puppeteer)
- Excel export library (ExcelJS)
- Analytics platform (optional: Mixpanel, Amplitude)

---

## 15. Migration Strategy

### 15.1 Data Migration

- For existing teachers: import historical lesson data (if available)
- Bulk import schools and classes from CSV
- Syllabus template library pre-population

### 15.2 User Training

- Video tutorials for key workflows
- In-app guided tours
- Quick start guide PDF
- Webinars for school administrators

### 15.3 Rollout Plan

1. **Pilot Phase**: 5-10 teachers, 2-3 schools, 1 month
2. **Beta Phase**: 50 teachers, 10 schools, 2 months
3. **General Availability**: Gradual rollout with monitoring
4. **Post-Launch Support**: Dedicated support team for first 3 months

---

## 16. Documentation Deliverables

### 16.1 Technical Documentation

- ✅ This specification document
- API documentation (auto-generated from GraphQL schema)
- Database schema documentation
- Deployment guide
- Troubleshooting guide

### 16.2 User Documentation

- User manual (teachers)
- Administrator guide
- Video tutorials
- FAQ document
- Keyboard shortcuts reference

---

## 17. Approval & Sign-off

| Role           | Name | Signature | Date |
| -------------- | ---- | --------- | ---- |
| Product Owner  |      |           |      |
| Technical Lead |      |           |      |
| UX Designer    |      |           |      |
| QA Lead        |      |           |      |

---

## Appendix A: Sample Workflows

### Workflow 1: First-Time Setup

1. Teacher logs in
2. Navigates to "Schools" → "Add School"
3. Enters school details
4. Creates first class (Grade 10-A)
5. Assigns subject (Mathematics)
6. Selects or creates syllabus
7. Logs first lesson

### Workflow 2: Daily Lesson Logging

1. Teacher opens dashboard
2. Clicks "Quick Lesson Entry"
3. Selects class (auto-filled if only one today)
4. Picks topics from dropdown (multi-select)
5. Enters duration and notes
6. Saves lesson (< 2 minutes total)

### Workflow 3: Weekly Progress Review

1. Teacher navigates to "Reports"
2. Selects "Weekly Summary"
3. Chooses date range
4. Reviews progress charts
5. Exports PDF for records

---

## Appendix B: Sample Data

### Sample School

```json
{
	"name": "Springfield High School",
	"location": "Springfield, IL",
	"address": "123 Education Lane",
	"phone": "+1-555-0100",
	"email": "admin@springfield-high.edu"
}
```

### Sample Lesson

```json
{
	"date": "2026-01-21",
	"classId": "cls_abc123",
	"classSubjectId": "csub_xyz789",
	"duration": 1.5,
	"teachingMethod": "LECTURE",
	"topicIds": ["topic_001", "topic_002"],
	"materialsUsed": [
		"Textbook Chapter 5",
		"YouTube: Khan Academy Linear Equations"
	],
	"homeworkAssigned": "Complete exercises 5.1-5.5 on page 123",
	"notes": "Students struggled with word problems. Plan extra practice next class.",
	"attendance": {
		"present": 28,
		"total": 30
	},
	"status": "COMPLETED"
}
```

---

## Document History

| Version | Date       | Author           | Changes       |
| ------- | ---------- | ---------------- | ------------- |
| 1.0     | 2026-01-21 | System Architect | Initial draft |

---

**End of Document**
