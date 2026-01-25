# Online University Web Application - Requirements Specification Document

**Document Version:** 4.0  
**Last Updated:** January 22, 2026  
**Status:** 📋 REQUIREMENTS SPECIFICATION  
**Document Type:** Software Requirements Specification (SRS)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview & Architecture](#2-system-overview--architecture)
3. [System Features & Functional Requirements](#3-system-features--functional-requirements)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Requirements](#6-data-requirements)
7. [Academic & Administrative Structure](#7-academic--administrative-structure)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Appendices](#9-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document defines the **Online University Web Application** - a comprehensive cloud-based Learning Management System (LMS) designed to deliver complete higher education experiences. The application provides end-to-end university operations including course delivery, student enrollment, academic administration, assessment management, and certification.

### 1.2 System Overview

The Online University Web Application is a modern educational platform that supports:

| Component                 | Target Users       | Description                                                  |
| ------------------------- | ------------------ | ------------------------------------------------------------ |
| **Academic Management**   | Administrators     | Program creation, course scheduling, enrollment management   |
| **Course Delivery**       | Students & Faculty | Interactive learning materials, assignments, and assessments |
| **Assessment System**     | Faculty & Students | Quizzes, exams, projects, and automated grading              |
| **Collaboration Tools**   | Students & Faculty | Discussion forums, group projects, and peer interactions     |
| **Reporting & Analytics** | Administrators     | Academic progress tracking and institutional analytics       |

### 1.3 Document Scope

This document covers:

- Online University application functional requirements
- System architecture and technology stack
- User interface and experience design specifications
- Data models and database design
- Implementation phases and deployment strategy

### 1.4 Implementation Roadmap

The Online University Web Application will be developed in phases to ensure quality delivery and manageable complexity:

| Component          | Status         | Priority | Estimated Effort | Dependencies       |
| ------------------ | -------------- | -------- | ---------------- | ------------------ |
| User Management    | ✅ Implemented | P0       | 2 weeks          | Authentication     |
| Course Catalog     | ✅ Implemented | P0       | 3 weeks          | -                  |
| Course Management  | ✅ Implemented | P0       | 6 weeks          | User Management    |
| Content Delivery   | ✅ Implemented | P0       | 4 weeks          | Storage Service    |
| Online Assessment  | ✅ Implemented | P1       | 6 weeks          | Course Management  |
| Discussion Forums  | ✅ Implemented | P1       | 3 weeks          | User Management    |
| Gradebook          | ✅ Implemented | P1       | 3 weeks          | Assessment System  |
| Live Sessions      | ✅ Implemented | P2       | 4 weeks          | WebRTC Integration |
| Learning Analytics | ✅ Implemented | P2       | 4 weeks          | Data Collection    |
| Mobile Application | ✅ Implemented | P3       | 8 weeks          | Core Features      |

### 1.5 Definitions & Acronyms

| Term   | Definition                              |
| ------ | --------------------------------------- |
| LMS    | Learning Management System              |
| SIS    | Student Information System              |
| SCORM  | Sharable Content Object Reference Model |
| xAPI   | Experience API (Tin Can API)            |
| SSO    | Single Sign-On                          |
| RBAC   | Role-Based Access Control               |
| CDN    | Content Delivery Network                |
| WebRTC | Web Real-Time Communication             |

---

## 2. System Overview & Architecture

### 2.1 Application Architecture

The Online University Web Application follows a modern cloud-native microservices architecture designed for scalability, reliability, and maintainability:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ONLINE UNIVERSITY WEB APPLICATION                         │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           FRONTEND LAYER                              │ │
│  │                                                                        │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐ │ │
│  │  │  STUDENT PORTAL  │  │  FACULTY PORTAL  │  │   ADMIN PORTAL       │ │ │
│  │  │                  │  │                  │  │                      │ │ │
│  │  │ • Course Access  │  │ • Course Mgmt    │  │ • User Management    │ │ │
│  │  │ • Assignments    │  │ • Grade Center   │  │ • Course Catalog     │ │ │
│  │  │ • Discussions    │  │ • Content Upload │  │ • System Config      │ │ │
│  │  │ • Gradebook      │  │ • Student Track  │  │ • Analytics Reports  │ │ │
│  │  │ • Live Sessions  │  │ • Discussion Mgmt│  │ • Content Review     │ │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────┘ │ │
│  └────────────────────────────────┬───────────────────────────────────────┘ │
│                                   │                                         │
│  ┌────────────────────────────────┴───────────────────────────────────────┐ │
│  │                            API GATEWAY                                 │ │
│  │            Authentication • Rate Limiting • Load Balancing             │ │
│  └────────────────────────────────┬───────────────────────────────────────┘ │
│                                   │                                         │
│  ┌────────────────────────────────┴───────────────────────────────────────┐ │
│  │                       MICROSERVICES LAYER                             │ │
│  │                                                                        │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐ │ │
│  │  │  USER SERVICE   │ │ COURSE SERVICE  │ │   ASSESSMENT SERVICE        │ │ │
│  │  │                 │ │                 │ │                             │ │ │
│  │  │ • Auth & Roles  │ │ • Course CRUD   │ │ • Quiz Management           │ │ │
│  │  │ • User Profiles │ │ • Enrollment    │ │ • Auto Grading              │ │ │
│  │  │ • Permissions   │ │ • Prerequisites │ │ • Submission Tracking       │ │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐ │ │
│  │  │ CONTENT SERVICE │ │DISCUSSION SERVICE│ │   ANALYTICS SERVICE         │ │ │
│  │  │                 │ │                 │ │                             │ │ │
│  │  │ • File Upload   │ │ • Forum Threads │ │ • Learning Progress         │ │ │
│  │  │ • Video Stream  │ │ • Peer Reviews  │ │ • Performance Metrics       │ │ │
│  │  │ • Document Mgmt │ │ • Live Chat     │ │ • Engagement Analytics      │ │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────────────────┘ │ │
│  └────────────────────────────────┬───────────────────────────────────────┘ │
│                                   │                                         │
│  ┌────────────────────────────────┴───────────────────────────────────────┐ │
│  │                      INFRASTRUCTURE LAYER                             │ │
│  │                                                                        │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐ │ │
│  │  │   DATABASE      │ │  FILE STORAGE   │ │     MESSAGE QUEUE           │ │ │
│  │  │  (PostgreSQL)   │ │      (S3)       │ │        (SQS)                │ │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐ │ │
│  │  │      CDN        │ │   MONITORING    │ │        EMAIL                │ │ │
│  │  │  (CloudFront)   │ │  (CloudWatch)   │ │        (SES)                │ │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 System Boundaries

#### 2.2.1 Application Scope

**In Scope:**

- Student user management and profiles
- Course creation, enrollment, and delivery
- Online quizzes, exams, and assignments
- Discussion forums and collaboration tools
- Live video sessions and recordings
- Student gradebook and digital certificates
- Learning analytics and progress tracking
- Content management and delivery
- Payment processing for course fees
- Multi-tenant support for institutions

**Out of Scope:**

- Physical campus management systems
- Library management systems
- Financial aid and student loans processing
- Dormitory and housing management
- Cafeteria and dining services
- Sports and extracurricular activity management

#### 2.2.2 System Responsibilities

The Online University Web Application is responsible for:

| Component              | Primary Responsibility                                | Implementation Details                  |
| ---------------------- | ----------------------------------------------------- | --------------------------------------- |
| **User Management**    | Student, faculty, and admin account management        | Authentication, authorization, profiles |
| **Course Content**     | Course creation, organization, and delivery           | Multimedia support, version control     |
| **Assessment System**  | Online quizzes, exams, and assignment management      | Auto-grading, rubrics, plagiarism check |
| **Discussion Forums**  | Peer-to-peer and instructor communication             | Threading, moderation, notifications    |
| **Progress Tracking**  | Student learning analytics and performance monitoring | Dashboards, reports, early warnings     |
| **Video Streaming**    | Live sessions and recorded content delivery           | WebRTC, CDN integration, transcoding    |
| **Certificate Mgmt**   | Digital credentials and completion certificates       | Blockchain verification, PDF generation |
| **Payment Processing** | Course fees, subscription management                  | Stripe integration, invoicing           |

### 2.3 Technology Stack

#### 2.3.1 Frontend Technologies

| Technology        | Usage                               | Justification                           |
| ----------------- | ----------------------------------- | --------------------------------------- |
| **React 18+**     | User interface framework            | Component reusability, large ecosystem  |
| **TypeScript**    | Type-safe JavaScript development    | Better code quality, IDE support        |
| **Material-UI**   | UI component library                | Consistent design, accessibility        |
| **Apollo Client** | GraphQL client and state management | Optimistic updates, caching             |
| **React Router**  | Client-side routing                 | Single-page application navigation      |
| **Socket.io**     | Real-time communication             | Live chat, notifications, collaboration |

#### 2.3.2 Backend Technologies

| Technology     | Usage                       | Justification                          |
| -------------- | --------------------------- | -------------------------------------- |
| **Node.js**    | Runtime environment         | JavaScript everywhere, performance     |
| **NestJS**     | Backend framework           | TypeScript-first, decorators, DI       |
| **GraphQL**    | API query language          | Flexible queries, type safety          |
| **Prisma**     | Database ORM                | Type-safe database access, migrations  |
| **PostgreSQL** | Primary database            | ACID compliance, advanced features     |
| **Redis**      | Caching and session storage | High performance, pub/sub capabilities |

#### 2.3.3 Infrastructure Technologies

| Technology     | Usage                        | Justification                       |
| -------------- | ---------------------------- | ----------------------------------- |
| **AWS ECS**    | Container orchestration      | Auto-scaling, load balancing        |
| **Docker**     | Application containerization | Consistent deployments              |
| **AWS S3**     | File and media storage       | Scalable, reliable, CDN integration |
| **CloudFront** | Content delivery network     | Global edge locations, performance  |
| **AWS SES**    | Email delivery service       | Reliable, scalable email sending    |
| **CloudWatch** | Monitoring and logging       | AWS native, alerts, dashboards      |

### 2.4 User Classes & Characteristics

#### 2.4.1 Primary Users

| User Role                | Description                    | Access Level                               |
| ------------------------ | ------------------------------ | ------------------------------------------ |
| **Student**              | Primary content consumer       | View courses, submit work, participate     |
| **Instructor**           | Course creator/facilitator     | Full course management, grading            |
| **Teaching Assistant**   | Instructor assistant           | Limited grading, forum moderation          |
| **Course Administrator** | Department coordinator         | Course catalog, enrollment management      |
| **System Administrator** | Technical system manager       | User management, system configuration      |
| **Institution Admin**    | Educational institution leader | Multi-tenant oversight, analytics, billing |

#### 2.4.2 User Characteristics

#### 2.4.3 New User: Student

```typescript
// Student - New role for Online University
interface StudentUser {
	id: string;
	email: string;
	name: string;
	role: "STUDENT";

	// Student-specific attributes
	studentId: string; // External/institution ID
	program?: string; // Enrolled program
	enrollmentDate: Date;
	graduationDate?: Date;

	// Relationships
	enrollments: Enrollment[]; // Course enrollments
	submissions: Submission[]; // Assignment submissions
	quizAttempts: QuizAttempt[];
	certificates: Certificate[];

	// Parent/guardian link (K-12)
	guardians?: ParentLink[];
}
```

### 2.5 Operating Environment

| Component     | Shared Infrastructure | Online University Specific   |
| ------------- | --------------------- | ---------------------------- |
| **Runtime**   | Node.js 18+ (Lambda)  | Same                         |
| **Database**  | PostgreSQL 14+ (RDS)  | Extended schema              |
| **Storage**   | S3                    | Video bucket, SCORM bucket   |
| **CDN**       | CloudFront            | Video streaming distribution |
| **Cache**     | ElastiCache Redis     | Session, quiz state          |
| **Video**     | -                     | MediaConvert, IVS            |
| **Real-time** | -                     | WebSocket (API Gateway)      |

- **Description:** Monitor student progress
- **Technical Expertise:** Basic
- **Frequency of Use:** Weekly
- **Key Needs:** Progress reports, communication with instructors

### 2.4 Operating Environment

| Component           | Requirement                                   |
| ------------------- | --------------------------------------------- |
| **Client Browsers** | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| **Mobile Devices**  | iOS 14+, Android 10+                          |
| **Server**          | Node.js 18+, PostgreSQL 14+                   |
| **Cloud Platform**  | AWS (Lambda, S3, CloudFront, RDS)             |
| **CDN**             | CloudFront for media delivery                 |

### 2.5 Design & Implementation Constraints

1. Must implement JWT-based authentication system
2. Must support SCORM 1.2 and 2004 content packages
3. Must comply with WCAG 2.1 AA accessibility standards
4. Must support concurrent users: 10,000+ simultaneous
5. Video streaming must support adaptive bitrate
6. All data must be encrypted at rest and in transit
7. Must support multi-tenant architecture for institutions
8. Must comply with FERPA and GDPR data privacy regulations

### 2.6 Assumptions & Dependencies

**Assumptions:**

- Users have stable internet connections (≥5 Mbps for video content)
- Students have access to devices with cameras/microphones for live sessions
- Instructors will receive training on content creation tools
- Educational institutions have IT support for integration

**Dependencies:**

- AWS cloud infrastructure availability and service reliability
- Third-party video conferencing API (WebRTC, Twilio Video)
- Payment gateway services for tuition processing (Stripe, PayPal)
- Email/SMS notification services (AWS SES, Twilio)
- Content delivery network for global media distribution

---

## 3. System Features & Functional Requirements

### 3.1 User Management & Authentication

#### REQ-AUTH-001: Multi-Role Authentication

**Priority:** P0 | **Complexity:** Medium

The system shall support authentication for multiple user roles with role-based access control.

| Role       | Permissions                                                |
| ---------- | ---------------------------------------------------------- |
| Student    | View courses, submit assignments, participate in forums    |
| Instructor | Create/manage courses, grade submissions, view analytics   |
| TA         | Grade submissions, moderate forums, view limited analytics |
| Admin      | Full system access, user management, configuration         |
| Parent     | View linked student progress (read-only)                   |

**Acceptance Criteria:**

- [ ] Users can register with email verification
- [ ] SSO integration with Google, Microsoft, and institutional IdP
- [ ] Two-factor authentication available for all users
- [ ] Password reset via email with secure tokens
- [ ] Session management with configurable timeout
- [ ] Login audit trail maintained

#### REQ-AUTH-002: Student Registration

**Priority:** P0 | **Complexity:** Low

```
Student Registration Flow:
1. Enter email, name, password
2. Select program/courses of interest
3. Verify email address
4. Complete profile (photo, bio, timezone)
5. Accept terms of service
6. Redirect to dashboard
```

#### REQ-AUTH-003: Institutional SSO

**Priority:** P1 | **Complexity:** High

Support SAML 2.0 and OAuth 2.0 for institutional single sign-on.

---

### 3.2 Course Management

#### REQ-COURSE-001: Course Creation

**Priority:** P0 | **Complexity:** High

Instructors shall be able to create and configure courses with the following attributes:

| Field         | Type     | Required | Description                           |
| ------------- | -------- | -------- | ------------------------------------- |
| title         | String   | Yes      | Course title (max 200 chars)          |
| code          | String   | Yes      | Unique course code (e.g., CS101)      |
| description   | Text     | Yes      | Rich text course description          |
| thumbnail     | Image    | No       | Course card image                     |
| category      | Enum     | Yes      | Subject category                      |
| level         | Enum     | Yes      | Beginner/Intermediate/Advanced        |
| duration      | Number   | Yes      | Estimated hours to complete           |
| prerequisites | Course[] | No       | Required prior courses                |
| startDate     | Date     | No       | Course start date (null = self-paced) |
| endDate       | Date     | No       | Course end date                       |
| maxEnrollment | Number   | No       | Enrollment cap                        |
| price         | Decimal  | No       | Course price (0 = free)               |
| visibility    | Enum     | Yes      | Draft/Published/Archived              |

**Acceptance Criteria:**

- [ ] Instructor can create course with all required fields
- [ ] Course can be saved as draft before publishing
- [ ] Course thumbnail auto-generates if not provided
- [ ] Duplicate course functionality available
- [ ] Course templates can be saved and reused

#### REQ-COURSE-002: Module & Lesson Structure

**Priority:** P0 | **Complexity:** Medium

Courses shall be organized into modules containing lessons:

```
Course
├── Module 1: Introduction
│   ├── Lesson 1.1: Welcome Video
│   ├── Lesson 1.2: Course Overview (Text)
│   ├── Lesson 1.3: Getting Started Guide (PDF)
│   └── Quiz 1: Pre-Assessment
├── Module 2: Core Concepts
│   ├── Lesson 2.1: Lecture Video
│   ├── Lesson 2.2: Interactive Simulation
│   ├── Lesson 2.3: Reading Materials
│   ├── Discussion: Module 2 Discussion
│   └── Assignment: Practical Exercise
└── Final Exam
```

#### REQ-COURSE-003: Content Types

**Priority:** P0 | **Complexity:** High

The system shall support the following content types:

| Content Type  | Format Support  | Max Size | Features                               |
| ------------- | --------------- | -------- | -------------------------------------- |
| Video         | MP4, WebM, HLS  | 5 GB     | Adaptive streaming, captions, chapters |
| Document      | PDF, DOCX, PPTX | 100 MB   | In-browser preview, download           |
| Rich Text     | HTML            | -        | Embedded media, formatting             |
| Interactive   | H5P, SCORM      | 500 MB   | xAPI tracking, completion              |
| External Link | URL             | -        | Embed or new tab                       |
| Live Session  | WebRTC          | -        | Recording, screen share                |

#### REQ-COURSE-004: Enrollment Management

**Priority:** P0 | **Complexity:** Medium

**Student Enrollment:**

- Self-enrollment for open courses
- Approval-required enrollment option
- Enrollment codes for restricted access
- Waitlist functionality when capacity reached
- Bulk enrollment via CSV import

**Acceptance Criteria:**

- [ ] Student can browse course catalog
- [ ] Student can enroll in open courses instantly
- [ ] Instructor receives notification for pending approvals
- [ ] Student added to waitlist if course is full
- [ ] Admin can bulk enroll students via CSV

#### REQ-COURSE-005: Progress Tracking

**Priority:** P0 | **Complexity:** Medium

Track and display student progress through courses:

```typescript
interface CourseProgress {
	courseId: string;
	studentId: string;
	enrolledAt: Date;

	// Completion tracking
	modulesCompleted: number;
	totalModules: number;
	lessonsCompleted: number;
	totalLessons: number;

	// Time tracking
	totalTimeSpent: number; // minutes
	lastAccessedAt: Date;

	// Performance
	averageQuizScore: number;
	assignmentsSubmitted: number;
	assignmentsPending: number;

	// Calculated
	completionPercentage: number;
	estimatedTimeRemaining: number;
	onTrackStatus: "ahead" | "on-track" | "behind";
}
```

---

### 3.3 Assessment Engine

#### REQ-ASSESS-001: Quiz Builder

**Priority:** P1 | **Complexity:** High

Instructors shall be able to create quizzes with various question types:

| Question Type   | Auto-Grade     | Description                 |
| --------------- | -------------- | --------------------------- |
| Multiple Choice | ✅             | Single correct answer       |
| Multiple Select | ✅             | Multiple correct answers    |
| True/False      | ✅             | Binary choice               |
| Fill in Blank   | ✅             | Text matching with variants |
| Matching        | ✅             | Pair items from two columns |
| Ordering        | ✅             | Arrange items in sequence   |
| Short Answer    | ⚠️ AI-Assisted | Brief text response         |
| Essay           | ❌             | Long-form written response  |
| File Upload     | ❌             | Document/code submission    |
| Code            | ✅             | Programming with test cases |

**Quiz Configuration:**

```typescript
interface QuizConfig {
	title: string;
	description?: string;
	timeLimit?: number; // minutes, null = unlimited
	attempts: number; // -1 = unlimited
	shuffleQuestions: boolean;
	shuffleAnswers: boolean;
	showCorrectAnswers: "never" | "after_submission" | "after_due_date";
	passingScore: number; // percentage
	availableFrom?: Date;
	availableUntil?: Date;
	latePenalty?: number; // percentage per day
	requireLockdownBrowser: boolean;
	requireWebcam: boolean;
}
```

#### REQ-ASSESS-002: Assignment Submission

**Priority:** P1 | **Complexity:** Medium

**Submission Types:**

- File upload (documents, images, archives)
- Text entry (rich text editor)
- URL submission (external work)
- GitHub repository link
- Recording (audio/video)

**Features:**

- Draft saving before final submission
- Submission versioning
- Late submission handling with penalties
- Plagiarism detection integration (Turnitin)
- Peer review assignments

#### REQ-ASSESS-003: Grading System

**Priority:** P1 | **Complexity:** High

**Grading Features:**

- Rubric-based grading
- Inline feedback on submissions
- Grade scales (letter, percentage, pass/fail)
- Grade weighting by category
- Curve grading options
- AI-powered automated grading for objective assessments

**Rubric Structure:**

```typescript
interface Rubric {
	id: string;
	name: string;
	criteria: RubricCriterion[];
}

interface RubricCriterion {
	name: string;
	description: string;
	weight: number; // percentage
	levels: RubricLevel[];
}

interface RubricLevel {
	name: string; // e.g., "Excellent", "Good", "Needs Improvement"
	points: number;
	description: string;
}
```

#### REQ-ASSESS-004: Gradebook

**Priority:** P1 | **Complexity:** Medium

**Gradebook Features:**

- Spreadsheet-style grade entry
- Category weights (assignments 40%, quizzes 30%, exams 30%)
- Automatic grade calculation
- Grade export (CSV, PDF)
- Student grade view with breakdown
- Grade dispute workflow

---

### 3.4 Communication & Collaboration

#### REQ-COLLAB-001: Discussion Forums

**Priority:** P1 | **Complexity:** Medium

**Forum Features:**

- Course-level and module-level forums
- Threaded discussions with replies
- Rich text with image/file embedding
- @mentions and notifications
- Upvoting and marking as answer
- Instructor can pin/lock threads
- Anonymous posting option
- Search within forums

**Moderation:**

- Flag inappropriate content
- Instructor/TA moderation queue
- Auto-flag based on keywords
- User reputation system

#### REQ-COLLAB-002: Direct Messaging

**Priority:** P2 | **Complexity:** Low

**Messaging Features:**

- One-on-one messaging
- Group conversations
- File sharing in messages
- Read receipts
- Message search
- Conversation archiving

#### REQ-COLLAB-003: Announcements

**Priority:** P1 | **Complexity:** Low

**Announcement Features:**

- Course-wide announcements
- Scheduled announcements
- Email/push notification delivery
- Read tracking
- Pin important announcements

#### REQ-COLLAB-004: Live Sessions (Video Conferencing)

**Priority:** P2 | **Complexity:** High

**Live Session Features:**

- Scheduled live classes
- Screen sharing
- Whiteboard collaboration
- Breakout rooms
- Recording with automatic upload
- Live chat and Q&A
- Attendance tracking
- Hand raising
- Polls during sessions

**Integration Options:**

- Zoom API
- Twilio Video
- Jitsi (self-hosted)
- AWS Chime

#### REQ-COLLAB-005: Group Projects

**Priority:** P2 | **Complexity:** Medium

**Group Features:**

- Instructor-assigned or self-formed groups
- Group workspace with shared files
- Group discussion board
- Peer evaluation forms
- Group submission with individual grades

---

### 3.5 Student Portal

#### REQ-STUDENT-001: Dashboard

**Priority:** P0 | **Complexity:** Medium

**Dashboard Components:**

```
┌─────────────────────────────────────────────────────────────┐
│  Welcome, [Student Name]!                    🔔 Notifications│
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Continue Learning │  │  Upcoming Due    │                 │
│  │ ────────────────  │  │  ────────────────│                 │
│  │ CS101: Lesson 4   │  │  📝 Quiz 2 - 2d  │                 │
│  │ [Resume Button]   │  │  📎 Essay - 5d   │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  My Courses                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ CS101   │ │ MATH201 │ │ ENG102  │ │  + Add  │           │
│  │ 65%     │ │ 40%     │ │ 90%     │ │  Course │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                              │
│  Recent Activity                        Weekly Progress      │
│  • Submitted Quiz 1 - 2h ago           ████████░░ 80%       │
│  • Joined discussion - 5h ago          Goal: 10 hrs/week    │
│  • Completed Lesson 3 - 1d ago         Actual: 8.5 hrs      │
└─────────────────────────────────────────────────────────────┘
```

#### REQ-STUDENT-002: Course Viewer

**Priority:** P0 | **Complexity:** Medium

**Course Page Features:**

- Syllabus overview
- Module navigation (collapsible sidebar)
- Lesson content display
- Progress indicators
- Next/Previous navigation
- Bookmarking
- Notes taking with sync
- Content search

#### REQ-STUDENT-003: Calendar Integration

**Priority:** P1 | **Complexity:** Low

- Unified calendar showing due dates, live sessions, events
- Export to Google Calendar, Outlook, Apple Calendar
- Personal reminders
- Timezone handling

#### REQ-STUDENT-004: Certificates & Achievements

**Priority:** P2 | **Complexity:** Low

**Certificate Features:**

- Auto-generated completion certificates
- Customizable certificate templates
- Blockchain verification option
- LinkedIn integration for sharing
- Achievement badges
- Course completion transcripts

---

### 3.6 Instructor Tools

#### REQ-INSTRUCTOR-001: Course Builder

**Priority:** P0 | **Complexity:** High

**Builder Features:**

- Drag-and-drop module/lesson ordering
- WYSIWYG content editor
- Video upload with transcoding
- File management
- Content preview
- Course import/export (Common Cartridge)
- Version history

#### REQ-INSTRUCTOR-002: Student Analytics

**Priority:** P1 | **Complexity:** Medium

**Analytics Dashboard:**

- Enrollment trends
- Content engagement (time spent, completion rates)
- Assessment performance distribution
- At-risk student identification
- Discussion participation metrics
- Grade distribution charts

**Individual Student View:**

- Activity timeline
- Progress through course
- Assessment history
- Engagement metrics
- Communication history

#### REQ-INSTRUCTOR-003: Feedback Tools

**Priority:** P1 | **Complexity:** Low

- Audio/video feedback on assignments
- Reusable comment bank
- Rubric-linked feedback
- Bulk feedback for common issues

---

### 3.7 Administration

#### REQ-ADMIN-001: User Management

**Priority:** P0 | **Complexity:** Medium

- User creation and bulk import
- Role assignment
- Account activation/deactivation
- Password reset administration
- User activity logs
- Login as user (support)

#### REQ-ADMIN-002: System Configuration

**Priority:** P1 | **Complexity:** Medium

- Branding (logo, colors, custom domain)
- Email templates
- Notification settings
- Feature toggles
- Integration configurations
- Storage quotas

#### REQ-ADMIN-003: Reporting

**Priority:** P1 | **Complexity:** Medium

**Standard Reports:**

- Enrollment report
- Course completion report
- Assessment performance report
- User activity report
- Revenue report (if paid courses)

**Features:**

- Custom report builder
- Scheduled report delivery
- Export formats (PDF, CSV, Excel)

---

## 4. External Interface Requirements

### 4.1 User Interfaces

#### UI-001: Responsive Design

All interfaces shall be responsive and functional on:

- Desktop (1920x1080, 1366x768)
- Tablet (1024x768, 768x1024)
- Mobile (375x667, 414x896)

#### UI-002: Accessibility

- WCAG 2.1 AA compliance
- Screen reader compatibility
- Keyboard navigation
- Color contrast ratios ≥4.5:1
- Focus indicators
- Alt text for images
- Closed captions for video

#### UI-003: Internationalization

- UTF-8 encoding throughout
- RTL language support
- Date/time localization
- Currency localization
- Translation framework (i18n)

### 4.2 Hardware Interfaces

#### HW-001: Webcam & Microphone

- WebRTC access for live sessions
- Recording for video submissions
- Proctoring during exams

#### HW-002: File System

- Drag-and-drop file upload
- Bulk file selection
- Progress indication for large uploads

### 4.3 Software Interfaces

#### SW-001: Payment Gateway

| Provider | Purpose                    |
| -------- | -------------------------- |
| Stripe   | Primary payment processing |
| PayPal   | Alternative payment method |

#### SW-002: Email Service

| Provider | Purpose                     |
| -------- | --------------------------- |
| AWS SES  | Transactional emails        |
| SendGrid | Marketing emails (optional) |

#### SW-003: Video Platform

| Provider         | Purpose           |
| ---------------- | ----------------- |
| AWS MediaConvert | Video transcoding |
| CloudFront       | Video streaming   |
| Twilio/Zoom      | Live video        |

#### SW-004: Third-Party Integrations

| Service          | Integration Type | Purpose                 |
| ---------------- | ---------------- | ----------------------- |
| Turnitin         | API              | Plagiarism detection    |
| Google Workspace | OAuth + API      | SSO, Calendar, Drive    |
| Microsoft 365    | OAuth + API      | SSO, Calendar, OneDrive |
| Zoom             | OAuth + API      | Video conferencing      |
| Slack            | Webhook          | Notifications           |
| GitHub           | OAuth + API      | Code submissions        |

### 4.4 Communication Interfaces

#### COMM-001: API

- GraphQL API (primary)
- REST API (legacy support)
- WebSocket for real-time features
- Rate limiting: 1000 req/min per user

#### COMM-002: Webhooks

Outbound webhooks for:

- Enrollment events
- Submission events
- Grade events
- Completion events

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

| Metric            | Requirement                   |
| ----------------- | ----------------------------- |
| Page Load Time    | < 2 seconds (90th percentile) |
| API Response Time | < 200ms (95th percentile)     |
| Video Start Time  | < 3 seconds                   |
| Concurrent Users  | 10,000 simultaneous           |
| File Upload       | Support up to 5GB files       |
| Search Results    | < 500ms                       |

### 5.2 Scalability Requirements

- Horizontal scaling via containerization (ECS/EKS)
- Database read replicas for query distribution
- CDN for static assets and media
- Queue-based processing for heavy operations
- Auto-scaling based on load metrics

### 5.3 Security Requirements

#### SEC-001: Authentication & Authorization

- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens with 15-minute expiry
- Refresh tokens with 7-day expiry
- RBAC enforced at API level
- Session invalidation on password change

#### SEC-002: Data Protection

- TLS 1.3 for all connections
- AES-256 encryption at rest
- PII anonymization in logs
- Data retention policies enforced
- GDPR right to erasure support

#### SEC-003: Application Security

- OWASP Top 10 compliance
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)
- CSRF tokens for state-changing operations
- Content Security Policy headers
- Regular security audits

### 5.4 Availability Requirements

| Metric                         | Target                           |
| ------------------------------ | -------------------------------- |
| Uptime                         | 99.9% (8.76 hours downtime/year) |
| Recovery Time Objective (RTO)  | < 1 hour                         |
| Recovery Point Objective (RPO) | < 15 minutes                     |
| Backup Frequency               | Every 6 hours                    |

### 5.5 Reliability Requirements

- Automated health checks every 30 seconds
- Circuit breakers for external services
- Graceful degradation for non-critical features
- Automated failover for database
- Retry logic with exponential backoff

### 5.6 Usability Requirements

- Task completion without external help: 90%
- Error rate: < 5% of interactions
- User satisfaction score: > 4.0/5.0
- Onboarding completion: > 80%
- Time to first value: < 5 minutes

### 5.7 Compliance Requirements

| Regulation    | Requirements                  |
| ------------- | ----------------------------- |
| FERPA         | Student record privacy (US)   |
| GDPR          | Data protection (EU)          |
| CCPA          | Consumer privacy (California) |
| WCAG 2.1      | Accessibility                 |
| SOC 2 Type II | Security controls             |

---

## 6. Data Requirements

### 6.1 Database Schema (Prisma Models)

```prisma
// ===========================================
// USER & AUTHENTICATION
// ===========================================

enum UserRole {
  STUDENT
  INSTRUCTOR
  TA
  ADMIN
  PARENT
}

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  passwordHash      String?
  name              String
  avatar            String?
  role              UserRole  @default(STUDENT)
  timezone          String    @default("UTC")
  locale            String    @default("en")
  isActive          Boolean   @default(true)
  emailVerified     Boolean   @default(false)
  twoFactorEnabled  Boolean   @default(false)
  lastLoginAt       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  studentProfile    StudentProfile?
  instructorProfile InstructorProfile?
  enrollments       Enrollment[]
  submissions       Submission[]
  forumPosts        ForumPost[]
  messages          Message[]
  notifications     Notification[]

  @@index([email])
  @@index([role])
}

model StudentProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  studentId     String   @unique // External student ID
  program       String?
  year          Int?
  gpa           Decimal?

  user          User     @relation(fields: [userId], references: [id])
}

model InstructorProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  department    String?
  title         String?
  bio           String?
  officeHours   String?

  user          User     @relation(fields: [userId], references: [id])
  courses       Course[]
}

// ===========================================
// COURSE STRUCTURE
// ===========================================

enum CourseStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum CourseLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

model Course {
  id              String       @id @default(cuid())
  code            String       @unique
  title           String
  description     String?
  thumbnail       String?
  category        String
  level           CourseLevel  @default(BEGINNER)
  duration        Int          // Estimated hours
  price           Decimal      @default(0)
  status          CourseStatus @default(DRAFT)
  maxEnrollment   Int?
  startDate       DateTime?
  endDate         DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  // Relations
  instructorId    String
  instructor      InstructorProfile @relation(fields: [instructorId], references: [id])
  modules         Module[]
  enrollments     Enrollment[]
  forums          Forum[]
  announcements   Announcement[]
  gradingPolicy   GradingPolicy?

  @@index([status])
  @@index([category])
  @@index([instructorId])
}

model Module {
  id          String   @id @default(cuid())
  courseId    String
  title       String
  description String?
  order       Int
  isPublished Boolean  @default(false)

  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons     Lesson[]

  @@index([courseId])
}

enum LessonType {
  VIDEO
  DOCUMENT
  TEXT
  QUIZ
  ASSIGNMENT
  LIVE_SESSION
  EXTERNAL_LINK
  SCORM
}

model Lesson {
  id              String     @id @default(cuid())
  moduleId        String
  title           String
  description     String?
  type            LessonType
  content         Json?      // Flexible content storage
  videoUrl        String?
  duration        Int?       // Minutes
  order           Int
  isPublished     Boolean    @default(false)
  requiredForCompletion Boolean @default(true)

  module          Module     @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  completions     LessonCompletion[]
  quiz            Quiz?
  assignment      Assignment?

  @@index([moduleId])
}

// ===========================================
// ENROLLMENT & PROGRESS
// ===========================================

enum EnrollmentStatus {
  ACTIVE
  COMPLETED
  DROPPED
  PENDING
}

model Enrollment {
  id              String           @id @default(cuid())
  userId          String
  courseId        String
  status          EnrollmentStatus @default(ACTIVE)
  enrolledAt      DateTime         @default(now())
  completedAt     DateTime?
  droppedAt       DateTime?
  progress        Decimal          @default(0)
  lastAccessedAt  DateTime?

  user            User             @relation(fields: [userId], references: [id])
  course          Course           @relation(fields: [courseId], references: [id])
  grades          Grade[]

  @@unique([userId, courseId])
  @@index([userId])
  @@index([courseId])
  @@index([status])
}

model LessonCompletion {
  id          String   @id @default(cuid())
  userId      String
  lessonId    String
  completedAt DateTime @default(now())
  timeSpent   Int      @default(0) // Seconds

  lesson      Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([userId, lessonId])
  @@index([userId])
}

// ===========================================
// ASSESSMENTS
// ===========================================

model Quiz {
  id                  String   @id @default(cuid())
  lessonId            String   @unique
  timeLimit           Int?     // Minutes
  attempts            Int      @default(1)
  shuffleQuestions    Boolean  @default(false)
  shuffleAnswers      Boolean  @default(false)
  showCorrectAnswers  String   @default("after_submission")
  passingScore        Decimal  @default(60)

  lesson              Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  questions           Question[]
  attempts_rel        QuizAttempt[]
}

enum QuestionType {
  MULTIPLE_CHOICE
  MULTIPLE_SELECT
  TRUE_FALSE
  FILL_BLANK
  MATCHING
  ORDERING
  SHORT_ANSWER
  ESSAY
  CODE
}

model Question {
  id          String       @id @default(cuid())
  quizId      String
  type        QuestionType
  text        String
  options     Json?        // For MC/MS questions
  correctAnswer Json?      // Varies by question type
  points      Decimal      @default(1)
  explanation String?
  order       Int

  quiz        Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  responses   QuestionResponse[]

  @@index([quizId])
}

model QuizAttempt {
  id          String   @id @default(cuid())
  userId      String
  quizId      String
  startedAt   DateTime @default(now())
  submittedAt DateTime?
  score       Decimal?
  isPassed    Boolean?

  quiz        Quiz     @relation(fields: [quizId], references: [id])
  responses   QuestionResponse[]

  @@index([userId])
  @@index([quizId])
}

model QuestionResponse {
  id          String   @id @default(cuid())
  attemptId   String
  questionId  String
  answer      Json
  isCorrect   Boolean?
  pointsEarned Decimal?
  feedback    String?

  attempt     QuizAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question    Question    @relation(fields: [questionId], references: [id])

  @@index([attemptId])
}

model Assignment {
  id              String   @id @default(cuid())
  lessonId        String   @unique
  instructions    String
  dueDate         DateTime?
  maxPoints       Decimal  @default(100)
  submissionTypes Json     // ['file', 'text', 'url']
  allowLate       Boolean  @default(true)
  latePenalty     Decimal  @default(10) // Percentage per day
  rubricId        String?

  lesson          Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  submissions     Submission[]
  rubric          Rubric?  @relation(fields: [rubricId], references: [id])
}

model Submission {
  id            String   @id @default(cuid())
  userId        String
  assignmentId  String
  content       Json     // Flexible for different submission types
  submittedAt   DateTime @default(now())
  isLate        Boolean  @default(false)
  grade         Decimal?
  feedback      String?
  gradedAt      DateTime?
  gradedBy      String?

  user          User       @relation(fields: [userId], references: [id])
  assignment    Assignment @relation(fields: [assignmentId], references: [id])

  @@index([userId])
  @@index([assignmentId])
}

// ===========================================
// GRADING
// ===========================================

model GradingPolicy {
  id          String   @id @default(cuid())
  courseId    String   @unique
  categories  Json     // [{name: 'Quizzes', weight: 30}, ...]
  gradeScale  Json     // [{min: 90, grade: 'A'}, ...]

  course      Course   @relation(fields: [courseId], references: [id])
}

model Grade {
  id            String   @id @default(cuid())
  enrollmentId  String
  category      String
  itemId        String   // Quiz or Assignment ID
  score         Decimal
  maxScore      Decimal
  weight        Decimal?
  createdAt     DateTime @default(now())

  enrollment    Enrollment @relation(fields: [enrollmentId], references: [id])

  @@index([enrollmentId])
}

model Rubric {
  id          String   @id @default(cuid())
  name        String
  criteria    Json     // Structured rubric criteria
  createdBy   String

  assignments Assignment[]
}

// ===========================================
// COMMUNICATION
// ===========================================

model Forum {
  id          String   @id @default(cuid())
  courseId    String
  title       String
  description String?

  course      Course     @relation(fields: [courseId], references: [id], onDelete: Cascade)
  posts       ForumPost[]

  @@index([courseId])
}

model ForumPost {
  id          String   @id @default(cuid())
  forumId     String
  userId      String
  parentId    String?
  title       String?
  content     String
  isPinned    Boolean  @default(false)
  isAnswer    Boolean  @default(false)
  upvotes     Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  forum       Forum      @relation(fields: [forumId], references: [id], onDelete: Cascade)
  user        User       @relation(fields: [userId], references: [id])
  parent      ForumPost? @relation("PostReplies", fields: [parentId], references: [id])
  replies     ForumPost[] @relation("PostReplies")

  @@index([forumId])
  @@index([userId])
}

model Message {
  id          String   @id @default(cuid())
  senderId    String
  recipientId String
  content     String
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  sender      User     @relation(fields: [senderId], references: [id])

  @@index([senderId])
  @@index([recipientId])
}

model Announcement {
  id          String   @id @default(cuid())
  courseId    String
  title       String
  content     String
  isPinned    Boolean  @default(false)
  publishedAt DateTime @default(now())

  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@index([courseId])
}

model Notification {
  id          String   @id @default(cuid())
  userId      String
  type        String
  title       String
  message     String
  link        String?
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([isRead])
}

// ===========================================
// LIVE SESSIONS
// ===========================================

model LiveSession {
  id            String   @id @default(cuid())
  lessonId      String
  title         String
  scheduledAt   DateTime
  duration      Int      // Minutes
  meetingUrl    String?
  recordingUrl  String?
  status        String   @default("scheduled")

  @@index([scheduledAt])
}

// ===========================================
// CERTIFICATES
// ===========================================

model Certificate {
  id            String   @id @default(cuid())
  userId        String
  courseId      String
  certificateId String   @unique
  issuedAt      DateTime @default(now())
  verifyUrl     String
  pdfUrl        String?

  @@index([userId])
  @@index([certificateId])
}
```

### 6.2 Data Migration Strategy

1. **User Migration:** Map existing Teacher users to Instructor role
2. **Content Migration:** Convert existing lesson plans to course modules
3. **Assessment Templates:** Create standardized quiz and exam templates

### 6.3 Data Retention

| Data Type      | Retention Period | Archive Policy           |
| -------------- | ---------------- | ------------------------ |
| User accounts  | Active + 7 years | Archive to cold storage  |
| Course content | Indefinite       | Version history kept     |
| Submissions    | 7 years          | Archive after course end |
| Grades         | 10 years         | Permanent retention      |
| Messages       | 3 years          | Auto-delete              |
| Logs           | 1 year           | Aggregate then delete    |

---

## 7. Academic & Administrative Structure

This section outlines how learning and instruction are organized within the online university.

### 7.1 Academic Structure 🎓

#### A. Colleges/Faculties & Departments

**Broad Disciplines:** The university would be divided into colleges or faculties (e.g., College of Engineering, Faculty of Humanities, School of Business), mirroring traditional university structures.

**Specialized Departments:** Within each college, there would be departments focusing on specific fields (e.g., Department of Computer Science, Department of English Literature, Department of Marketing).

#### B. Course & Program Design

**Modular Course Structure:** Courses are broken down into manageable modules or units, each with clear learning objectives, content, activities, and assessments.

**Blended Learning Options:** While primarily online, some programs might incorporate optional in-person components or virtual live sessions for interactive learning.

**Asynchronous & Synchronous Learning:**

- **Asynchronous:** Students access materials and complete activities at their own pace (e.g., pre-recorded lectures, discussion boards).
- **Synchronous:** Real-time interaction (e.g., live webinars, virtual office hours).

**Curriculum Development Committee:** A dedicated committee responsible for designing, reviewing, and updating course curricula to ensure relevance and quality.

#### C. Faculty & Instructor Roles

- **Course Instructors:** Deliver content, facilitate discussions, provide feedback, and grade assignments.
- **Teaching Assistants (TAs):** Support instructors with grading, answering student queries, and managing discussion forums.
- **Instructional Designers:** Work with faculty to create engaging and effective online learning materials and activities.

#### D. Academic Support Services

- **Online Tutoring:** Accessible one-on-one or group tutoring sessions for various subjects.
- **Writing Centers:** Support for academic writing, including essay structure, grammar, and citation.
- **Research Assistance:** Guidance on conducting research and accessing academic databases.

### 7.2 Administrative Structure 🏛️

#### A. University Leadership

- **President/Vice-Chancellor:** Oversees the entire university, sets strategic direction, and ensures overall quality.
- **Provost/Academic Dean:** Responsible for academic programs, faculty appointments, and curriculum.
- **Registrar:** Manages student records, course registration, academic calendars, and transcript issuance.
- **Admissions Office:** Handles student recruitment, applications, and enrollment processes.

#### B. Student Services

- **Admissions & Enrollment:** Online application portals, admissions counseling, and simplified enrollment procedures.
- **Academic Advising:** Dedicated advisors to guide students on program selection, course planning, and career paths.
- **Technical Support:** 24/7 technical assistance for platform issues, software problems, and connectivity challenges.
- **Financial Aid Office:** Assistance with scholarships, grants, and loan applications.
- **Career Services:** Online resources for job searching, resume building, interview preparation, and career counseling.
- **Mental Health & Wellness:** Access to online counseling services and mental health resources.

#### C. Quality Assurance & Accreditation

- **Internal Review Process:** Regular self-assessments of programs, courses, and services to identify areas for improvement.
- **External Accreditation:** Seeking and maintaining accreditation from recognized national and international bodies to ensure credibility and transferability of credits.
- **Student Feedback Mechanisms:** Surveys, focus groups, and suggestion boxes to gather student input for continuous improvement.

### 7.3 Technological Infrastructure 💻

#### A. Learning Management System (LMS)

**Central Hub:** The core platform for delivering course content, facilitating interactions, managing assignments, and tracking student progress.

**Features:**

- Discussion forums
- Assignment submission
- Grading tools
- Quizzes
- Content repositories
- Analytics

#### B. Communication & Collaboration Tools

- **Video Conferencing:** For live lectures, virtual office hours, and group meetings (e.g., Zoom, Google Meet, Microsoft Teams).
- **Internal Messaging System:** Secure platform for direct communication between students, faculty, and administration.
- **Email System:** Official university email accounts for all users.

#### C. Administrative Systems

- **Student Information System (SIS):** Manages student demographics, academic history, grades, and financial records.
- **Enterprise Resource Planning (ERP):** Integrates various business functions like finance, HR, and supply chain management for efficient operations.
- **Analytics & Reporting Dashboards:** Provide data on student performance, course engagement, and operational efficiency for informed decision-making.

#### D. Security & Data Management

- **Cybersecurity Measures:** Robust firewalls, intrusion detection systems, data encryption, and regular security audits to protect sensitive data.
- **Data Backup & Recovery:** Regular backups of all critical data with a comprehensive disaster recovery plan.
- **Privacy Compliance:** Adherence to data protection regulations (e.g., GDPR, CCPA) to safeguard user privacy.

---

## 8. Implementation Roadmap

### 8.1 Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ONLINE UNIVERSITY IMPLEMENTATION PHASES                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: Foundation (3-4 months)                                          │
│  ═══════════════════════════════                                           │
│  • User roles & authentication                                              │
│  • Course structure (Course → Module → Lesson)                             │
│  • Basic content delivery (text, video, documents)                         │
│  • Student enrollment & progress tracking                                   │
│                                                                             │
│  PHASE 2: Assessment (2-3 months)                                          │
│  ════════════════════════════════                                           │
│  • Quiz builder with auto-grading                                          │
│  • Assignment submission system                                             │
│  • Rubric-based grading                                                     │
│  • Gradebook with weighted categories                                       │
│  • Integration with AI grading engine                                       │
│                                                                             │
│  PHASE 3: Collaboration (2 months)                                         │
│  ═════════════════════════════════                                          │
│  • Discussion forums                                                        │
│  • Direct messaging                                                         │
│  • Announcements                                                            │
│  • Course notifications                                                     │
│                                                                             │
│  PHASE 4: Advanced Features (Ongoing)                                      │
│  ════════════════════════════════════                                       │
│  • Live video sessions                                                      │
│  • Analytics dashboards                                                     │
│  • Certificates & achievements                                              │
│  • Mobile application                                                       │
│  • Third-party integrations                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Phase 1: Foundation (Months 1-4)

**Objective:** Establish core LMS functionality for course creation and student enrollment.

| Sprint | Deliverables                                           | Duration |
| ------ | ------------------------------------------------------ | -------- |
| 1.1    | Database schema, User model extension, Role-based auth | 2 weeks  |
| 1.2    | Course CRUD, Module/Lesson structure                   | 2 weeks  |
| 1.3    | Video upload, transcoding pipeline                     | 2 weeks  |
| 1.4    | Student enrollment flow, waitlist                      | 2 weeks  |
| 1.5    | Progress tracking, course dashboard                    | 2 weeks  |
| 1.6    | Content viewer (video, documents, text)                | 2 weeks  |
| 1.7    | Testing, bug fixes, documentation                      | 2 weeks  |

**Success Criteria:**

- [ ] Students can register and enroll in courses
- [ ] Instructors can create courses with modules and lessons
- [ ] Video content plays with adaptive streaming
- [ ] Progress is accurately tracked and displayed

### 8.3 Phase 2: Assessment (Months 5-7)

**Objective:** Enable comprehensive assessment and grading capabilities.

| Sprint | Deliverables                                    | Duration |
| ------ | ----------------------------------------------- | -------- |
| 2.1    | Quiz model, question types (MC, TF, fill-blank) | 2 weeks  |
| 2.2    | Quiz taking UI, timer, auto-submit              | 2 weeks  |
| 2.3    | Auto-grading engine, feedback display           | 2 weeks  |
| 2.4    | Assignment submission, file upload              | 2 weeks  |
| 2.5    | Rubric builder, manual grading UI               | 2 weeks  |
| 2.6    | Gradebook, grade calculations                   | 2 weeks  |

**Success Criteria:**

- [ ] Quizzes auto-grade with immediate feedback
- [ ] Assignments can be submitted and graded with rubrics
- [ ] Students can view grade breakdown
- [ ] AI grading engine integrates for essay/short answer

### 8.4 Phase 3: Collaboration (Months 8-9)

**Objective:** Enable communication between students and instructors.

| Sprint | Deliverables                     | Duration |
| ------ | -------------------------------- | -------- |
| 3.1    | Forum model, post/reply CRUD     | 2 weeks  |
| 3.2    | Forum UI, threading, @mentions   | 2 weeks  |
| 3.3    | Direct messaging, notifications  | 2 weeks  |
| 3.4    | Announcements, email integration | 2 weeks  |

**Success Criteria:**

- [ ] Students can post and reply in course forums
- [ ] Direct messaging works between users
- [ ] Notifications delivered via email and in-app

### 8.5 Phase 4: Advanced (Month 10+)

**Objective:** Add differentiating features and polish.

| Feature                           | Est. Duration | Priority |
| --------------------------------- | ------------- | -------- |
| Live video sessions (Zoom/Twilio) | 4 weeks       | P2       |
| Learning analytics dashboard      | 4 weeks       | P2       |
| Certificate generation            | 2 weeks       | P2       |
| Mobile app (React Native)         | 8 weeks       | P3       |
| SCORM/xAPI support                | 3 weeks       | P3       |
| Plagiarism detection              | 2 weeks       | P3       |
| Payment integration               | 3 weeks       | P3       |

### 8.6 Resource Requirements

| Role                 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
| -------------------- | ------- | ------- | ------- | ------- |
| Full-stack Developer | 2       | 2       | 1       | 2       |
| Frontend Developer   | 1       | 1       | 1       | 1       |
| Backend Developer    | 1       | 1       | 1       | 1       |
| DevOps Engineer      | 0.5     | 0.5     | 0.25    | 0.5     |
| UI/UX Designer       | 0.5     | 0.5     | 0.5     | 0.5     |
| QA Engineer          | 1       | 1       | 1       | 1       |
| Product Manager      | 1       | 1       | 1       | 1       |

**Estimated Total Effort:** 8-12 developer-months

### 8.7 Integration with Existing Systems

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐         ┌─────────────┐                      │
│   │   Online    │◄───────►│    Auth     │                      │
│   │ University  │         │   Service   │ (Extend for Student) │
│   └──────┬──────┘         └─────────────┘                      │
│          │                                                      │
│          ▼                                                      │
│   ┌─────────────┐         ┌─────────────┐                      │
│   │  Assessment │◄───────►│ AI Engine  │ (Essay grading)      │
│   │   Engine    │         │   Service   │                      │
│   └─────────────┘         └─────────────┘                      │
│          │                                                      │
│          ▼                                                      │
│   ┌─────────────┐         ┌─────────────┐                      │
│   │   Course    │◄───────►│   Lesson    │ (Content sync)       │
│   │   Modules   │         │  Tracking   │                      │
│   └─────────────┘         └─────────────┘                      │
│          │                                                      │
│          ▼                                                      │
│   ┌─────────────┐                                               │
│   │   Storage   │ (S3 - Reuse existing)                        │
│   │   Service   │                                               │
│   └─────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Appendices

### Appendix A: API Endpoints (GraphQL)

```graphql
# ===========================================
# QUERIES
# ===========================================

type Query {
	# Courses
	courses(filter: CourseFilter, pagination: Pagination): CourseConnection!
	course(id: ID!): Course
	myCourses: [Enrollment!]!

	# Modules & Lessons
	module(id: ID!): Module
	lesson(id: ID!): Lesson

	# Assessments
	quiz(id: ID!): Quiz
	quizAttempt(id: ID!): QuizAttempt
	myQuizAttempts(quizId: ID!): [QuizAttempt!]!
	assignment(id: ID!): Assignment
	submission(id: ID!): Submission
	mySubmissions(assignmentId: ID!): [Submission!]!

	# Grades
	myGrades(courseId: ID!): [Grade!]!
	gradebook(courseId: ID!): Gradebook!

	# Forums
	forum(id: ID!): Forum
	forumPosts(forumId: ID!, pagination: Pagination): ForumPostConnection!

	# Progress
	courseProgress(courseId: ID!): CourseProgress!
	lessonCompletion(lessonId: ID!): LessonCompletion

	# Analytics (Instructor)
	courseAnalytics(courseId: ID!): CourseAnalytics!
	studentAnalytics(courseId: ID!, userId: ID!): StudentAnalytics!
}

# ===========================================
# MUTATIONS
# ===========================================

type Mutation {
	# Courses
	createCourse(input: CreateCourseInput!): Course!
	updateCourse(id: ID!, input: UpdateCourseInput!): Course!
	deleteCourse(id: ID!): Boolean!
	publishCourse(id: ID!): Course!
	archiveCourse(id: ID!): Course!

	# Modules & Lessons
	createModule(input: CreateModuleInput!): Module!
	updateModule(id: ID!, input: UpdateModuleInput!): Module!
	deleteModule(id: ID!): Boolean!
	reorderModules(courseId: ID!, moduleIds: [ID!]!): [Module!]!

	createLesson(input: CreateLessonInput!): Lesson!
	updateLesson(id: ID!, input: UpdateLessonInput!): Lesson!
	deleteLesson(id: ID!): Boolean!
	reorderLessons(moduleId: ID!, lessonIds: [ID!]!): [Lesson!]!

	# Enrollment
	enrollInCourse(courseId: ID!): Enrollment!
	dropCourse(enrollmentId: ID!): Boolean!
	approveEnrollment(enrollmentId: ID!): Enrollment!

	# Progress
	markLessonComplete(lessonId: ID!): LessonCompletion!
	updateLessonProgress(lessonId: ID!, timeSpent: Int!): LessonCompletion!

	# Quizzes
	createQuiz(input: CreateQuizInput!): Quiz!
	updateQuiz(id: ID!, input: UpdateQuizInput!): Quiz!
	deleteQuiz(id: ID!): Boolean!
	addQuestion(quizId: ID!, input: QuestionInput!): Question!
	updateQuestion(id: ID!, input: QuestionInput!): Question!
	deleteQuestion(id: ID!): Boolean!

	startQuizAttempt(quizId: ID!): QuizAttempt!
	submitQuizAttempt(attemptId: ID!, answers: [AnswerInput!]!): QuizAttempt!

	# Assignments
	createAssignment(input: CreateAssignmentInput!): Assignment!
	updateAssignment(id: ID!, input: UpdateAssignmentInput!): Assignment!
	deleteAssignment(id: ID!): Boolean!

	submitAssignment(assignmentId: ID!, input: SubmissionInput!): Submission!
	gradeSubmission(submissionId: ID!, input: GradeInput!): Submission!

	# Forums
	createForumPost(input: ForumPostInput!): ForumPost!
	updateForumPost(id: ID!, input: ForumPostInput!): ForumPost!
	deleteForumPost(id: ID!): Boolean!
	upvotePost(postId: ID!): ForumPost!
	markAsAnswer(postId: ID!): ForumPost!

	# Messaging
	sendMessage(input: MessageInput!): Message!
	markMessageRead(id: ID!): Message!

	# Announcements
	createAnnouncement(input: AnnouncementInput!): Announcement!
	updateAnnouncement(id: ID!, input: AnnouncementInput!): Announcement!
	deleteAnnouncement(id: ID!): Boolean!
}

# ===========================================
# SUBSCRIPTIONS
# ===========================================

type Subscription {
	messageReceived: Message!
	notificationReceived: Notification!
	forumPostCreated(forumId: ID!): ForumPost!
	gradeUpdated(courseId: ID!): Grade!
}
```

### Appendix B: UI Wireframes

#### Student Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]  Online University              🔔 ✉️  [Avatar ▼]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Welcome back, Sarah!                                           │
│                                                                 │
│  ┌──────────────────────────────┐  ┌──────────────────────────┐│
│  │  📚 Continue Learning         │  │  📅 Upcoming             ││
│  │                              │  │                          ││
│  │  CS101: Data Structures      │  │  • Quiz 3 - Tomorrow     ││
│  │  Module 4: Trees             │  │  • Essay Due - 3 days    ││
│  │  ████████████░░░ 75%         │  │  • Live Session - Fri    ││
│  │                              │  │                          ││
│  │  [Continue →]                │  │  [View Calendar]         ││
│  └──────────────────────────────┘  └──────────────────────────┘│
│                                                                 │
│  My Courses                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ [thumb] │ │ [thumb] │ │ [thumb] │ │         │               │
│  │ CS101   │ │ MATH201 │ │ ENG102  │ │   + Add │               │
│  │ ████░░  │ │ ██████░ │ │ ████████│ │  Course │               │
│  │ 65%     │ │ 85%     │ │ 100% ✓  │ │         │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│                                                                 │
│  Recent Activity                                                │
│  ├─ Completed "Binary Trees" lesson - 2 hours ago               │
│  ├─ Scored 85% on Quiz 2 - Yesterday                           │
│  └─ Posted in Discussion Forum - 2 days ago                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Course Viewer

```
┌─────────────────────────────────────────────────────────────────┐
│  [←]  CS101: Data Structures                    🔔 ✉️  [Avatar] │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│  📚 Modules      │   Module 4: Trees                            │
│                  │                                              │
│  ✓ M1: Intro     │   Lesson 4.2: Binary Search Trees           │
│  ✓ M2: Arrays    │   ──────────────────────────────────────────│
│  ✓ M3: Lists     │                                              │
│  ▼ M4: Trees     │   ┌─────────────────────────────────────────┐│
│    ✓ 4.1 Basics  │   │                                         ││
│    ► 4.2 BST     │   │     [VIDEO PLAYER]                      ││
│      4.3 AVL     │   │                                         ││
│      4.4 Quiz    │   │     Introduction to BST                 ││
│    M5: Graphs    │   │     Duration: 15:32                     ││
│    M6: Hashing   │   │                                         ││
│                  │   └─────────────────────────────────────────┘│
│  ──────────────  │                                              │
│  📊 Progress     │   Transcript | Resources | Notes             │
│  ████████░░ 75%  │                                              │
│                  │   A Binary Search Tree (BST) is a binary    │
│  ⏱️ 12h spent    │   tree where each node has at most two      │
│                  │   children, and for each node...            │
│                  │                                              │
│                  │   [Mark Complete]  [◄ Previous] [Next ►]    │
└──────────────────┴──────────────────────────────────────────────┘
```

### Appendix C: Error Codes

| Code       | Message                  | Resolution                |
| ---------- | ------------------------ | ------------------------- |
| AUTH_001   | Invalid credentials      | Check email/password      |
| AUTH_002   | Session expired          | Re-login required         |
| AUTH_003   | Insufficient permissions | Contact administrator     |
| ENROLL_001 | Course is full           | Join waitlist             |
| ENROLL_002 | Prerequisites not met    | Complete required courses |
| SUBMIT_001 | Past due date            | Contact instructor        |
| SUBMIT_002 | File too large           | Reduce file size          |
| QUIZ_001   | Time limit exceeded      | Attempt auto-submitted    |
| QUIZ_002   | No attempts remaining    | Contact instructor        |

### Appendix D: Glossary

| Term           | Definition                                                     |
| -------------- | -------------------------------------------------------------- |
| **Module**     | A unit of content within a course, containing multiple lessons |
| **Lesson**     | A single piece of content (video, text, quiz, etc.)            |
| **Enrollment** | A student's registration in a course                           |
| **Rubric**     | A scoring guide for assignments with defined criteria          |
| **Gradebook**  | A record of all grades for a course                            |
| **Forum**      | A discussion space for course participants                     |
| **Attempt**    | A single instance of taking a quiz                             |

---

## Document History

| Version | Date       | Author | Changes                                                                            |
| ------- | ---------- | ------ | ---------------------------------------------------------------------------------- |
| 1.0     | 2025-12-15 | System | Initial conceptual design                                                          |
| 2.0     | 2026-01-21 | System | Complete SRS with functional requirements, data models, and implementation roadmap |

---

_This document serves as a comprehensive requirements specification for the Online University Web Application. Development should follow the phased approach outlined in the implementation roadmap, beginning with core user management and course catalog functionality before advancing to more complex features like live video sessions and advanced analytics._
