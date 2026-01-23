# Specification Document: Academia ML-Powered Grading System Web App (AWS)

Revision: 2026-01-23
Status: Comprehensive — detailed user roles, UI design, and grading system specification

## Document Updates Summary

**Latest Update (2026-01-23):**

- ✅ Comprehensive user roles and permissions defined (6 roles: Students, Faculty, Administrators, Support Staff, Parents/Guardians, Alumni/Guests)
- ✅ Detailed UI screen specifications for all user roles with navigation layouts
- ✅ Complete grading system workflow from exam setting to automated grading and review
- ✅ Enhanced with ML training process using sample marked scripts
- ✅ Teacher review and model adjustment workflows detailed
- ✅ Reporting and analytics modules expanded
- ✅ UI/UX design principles and component specifications added
- ✅ Phased implementation roadmap with 16-week timeline

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Stakeholders](#2-stakeholders)
   - 2A. [Users and Roles](#2a-users-and-roles-in-the-online-university-web-app)
3. [High-level System Overview](#3-high-level-system-overview)
   - 3A. [User Interface Screens Design](#3a-user-interface-screens-design)
4. [Requirements Checklist](#4-requirements-checklist-derived-from-psdmd)
5. [Modules & Responsibilities](#5-modules--responsibilities-detailed)
   - 5A. [Comprehensive Grading System Design](#5a-comprehensive-grading-system-design)
6. [Data & API Contracts](#6-data--api-contracts-minimal-examples)
7. [ML Pipeline Design](#7-ml-pipeline-design-implementation-guidance)
8. [Image/OCR Considerations](#8-imageocr-considerations)
9. [Non-Functional Requirements](#9-non-functional-requirements-expanded)
10. [Testing & Validation](#10-testing--validation)
11. [Deployment & CI/CD](#11-deployment--cicd)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [Roadmap & Open Improvements](#13-roadmap--open-improvements)
    - 13A. [UI/UX Design Considerations](#13a-uiux-design-considerations)
14. [Acceptance Criteria](#14-acceptance-criteria)
15. [Next Steps](#15-next-steps-practical)

## 1. Purpose & Scope

Purpose: define a clear, implementable specification for a web application that automates grading of handwritten student answer sheets by learning from a teacher's annotated examples and producing printable, teacher-styled marked scripts.

Scope:

- End-to-end: upload/scan -> teacher annotation -> model training -> automated grading -> printable output and reporting.
- Web app for teachers/admins; optional on-premises printer integration.
- Decomposed into modular services to allow independent development, scaling, and replacement.

## 2. Stakeholders

- Teachers: primary users who upload, annotate, review, and print marked scripts.
- Administrators: manage users, templates, and system configurations.
- DevOps/Engineers: deploy, monitor, and extend services.
- Students (indirect): receive final printed scripts and reports.

## 2A. Users and Roles in the Online University Web App

### 2A.1 Students

**Actions they can take:**

- Register for courses and view course catalog
- Access lecture materials, assignments, and readings
- Submit assignments and projects
- Participate in discussion forums, chats, or group workspaces
- Take quizzes, exams, and view grades
- Communicate with instructors and peers
- Manage personal profile and academic records
- Pay tuition or fees online
- Request transcripts or certificates

### 2A.2 Faculty / Instructors

**Actions they can take:**

- Create, edit, and publish course content (lectures, assignments, quizzes)
- Grade assignments and exams
- Provide feedback to students
- Manage class rosters and attendance
- Host live sessions or office hours
- Communicate with students via announcements or messaging
- Track student progress and performance
- Approve or deny course enrollment requests (if applicable)
- Set exam papers and marking guides
- Train grading models with sample marked scripts
- Review and adjust automatically graded scripts

### 2A.3 Administrators

**Actions they can take:**

- Manage user accounts (students, faculty, staff)
- Oversee course catalog and program structures
- Handle admissions, enrollment, and graduation processes
- Manage tuition, billing, and financial aid
- Generate institutional reports (academic performance, enrollment stats)
- Configure system settings (roles, permissions, integrations)
- Ensure compliance with accreditation and policies
- Moderate content and resolve disputes

### 2A.4 Support Staff (IT / Helpdesk)

**Actions they can take:**

- Provide technical support for students and faculty
- Troubleshoot login, access, or system errors
- Maintain servers, databases, and security protocols
- Manage updates and system upgrades
- Monitor system performance and uptime

### 2A.5 Parents / Guardians (Optional Role)

**Actions they can take:**

- View student progress reports
- Access billing and payment information
- Receive notifications about academic performance or deadlines

### 2A.6 External Users (Guest / Alumni)

**Actions they can take:**

- Browse public course catalog
- Access alumni resources (career services, networking)
- Enroll in continuing education or certificate programs
- Limited access to forums or events

### 2A.7 Role Summary Table

| Role           | Key Actions                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Students       | Register courses, access materials, submit work, view grades, pay fees                             |
| Faculty        | Create content, grade, give feedback, manage classes, communicate, set exams, train grading models |
| Administrators | Manage users, programs, finances, reports, compliance, system settings                             |
| Support Staff  | Technical support, troubleshoot, maintain system, ensure security                                  |
| Parents        | View progress, billing info, receive notifications                                                 |
| Alumni/Guests  | Browse catalog, enroll in programs, access alumni resources                                        |

## 3. High-level System Overview

The system is organized as a set of cooperating modules (microservices where appropriate). Key flows:

1.  Teacher uploads a blank template, answer key, and a small annotated set of student sheets (training set).
2.  Annotation UI captures teacher marks and labels; data is persisted to storage.
3.  ML training pipeline consumes labeled data, trains or fine-tunes a model and stores the artifact.
4.  Remaining sheets are scanned, processed by image pipeline + OCR, then graded using the trained model.
5.  Marked overlays and printable PDFs are generated; print jobs are dispatched or PDFs are provided for download.
6.  Reporting and analytics summarize student and class performance.

## 3A. User Interface Screens Design

### 3A.1 Student Screens

**Dashboard**

- Overview of enrolled courses
- Upcoming deadlines, exams, and announcements
- Quick links to assignments, grades, and payments
- Progress tracker with completion percentages per course

**Course Page**

- Lecture materials (videos, PDFs, slides)
- Assignments submission area
- Discussion forum
- Progress tracker
- Syllabus and course information

**Grades & Transcript**

- Current grades per course
- GPA calculator
- Request transcript button
- Grade history and trends

**Payments & Fees**

- Tuition balance
- Online payment gateway
- Payment history and receipts

**Profile**

- Personal info, contact details
- Academic history
- Notification preferences

### 3A.2 Faculty / Instructor Screens

**Instructor Dashboard**

- List of courses taught
- Notifications (student submissions, questions)
- Quick access to grading and course management

**Course Management**

- Upload/edit lectures, assignments, quizzes
- Manage syllabus
- Course settings and enrollment management

**Exam Paper Setting**

- Create and edit exam questions (MCQs, short-answer, essays, problem-solving)
- Define marks allocation per question
- Question bank access and template reuse
- Generate marking guides

**Grading Center**

- View submissions
- Grade and provide feedback
- Upload sample marked scripts for model training
- Review automatically graded scripts
- Audit and adjust model grading

**Communication**

- Announcements
- Messaging with students
- Office hours scheduling

**Analytics**

- Student performance charts
- Attendance records
- Grade distributions and trends
- Common mistakes identification

### 3A.3 Administrator Screens

**Admin Dashboard**

- System overview (active users, courses, payments)
- Key performance indicators
- System health monitoring

**User Management**

- Create/edit student and faculty accounts
- Role assignment and permissions
- Bulk user operations

**Course Catalog Management**

- Add/remove courses
- Approve faculty course proposals
- Program structure management

**Finance & Billing**

- Tuition tracking
- Financial aid management
- Payment reconciliation

**Reports**

- Enrollment statistics
- Academic performance trends
- Financial reports
- Compliance reporting

### 3A.4 Support Staff Screens

**Support Dashboard**

- Ticket system for student/faculty issues
- System health monitoring
- Active incidents tracking

**Technical Tools**

- Server status
- Error logs
- Security alerts
- System maintenance tools

### 3A.5 Parent / Guardian Screens

**Parent Dashboard**

- Student progress overview
- Notifications on grades or deadlines
- Academic calendar

**Billing**

- Tuition and fee details
- Payment options
- Payment history

### 3A.6 Alumni / Guest Screens

**Alumni Portal**

- Career services
- Networking events
- Alumni directory

**Guest Access**

- Browse course catalog
- Enroll in continuing education
- Public resources and events

### 3A.7 Navigation Layout

**Top Navigation Bar:** Home | Courses | Dashboard | Messages | Profile | Help

**Sidebar (Role-Specific):**

- Students: Assignments, Grades, Payments, Calendar
- Faculty: Course Management, Grading, Analytics, Communications
- Administrators: Reports, User Management, System Settings
- Support Staff: Tickets, System Tools, Monitoring

**Footer:** Contact info, Privacy Policy, Terms of Service

## 4. Requirements Checklist (derived from `PSD.md`)

- [x] Coherent, detailed specification for web app on AWS
- [x] Functional decomposition into modules and responsibilities
- [x] Non-functional requirements (accuracy, performance, scalability, security)
- [x] Technology stack and AWS mapping
- [x] Test, deployment, and improvement recommendations

## 5. Modules & Responsibilities (detailed)

5.1 User & Identity Module

- Authentication & authorization (AWS Cognito)
- Role-based access (teacher, admin)
- Profile and preferences (default printer, templates)
- Audit logs of uploads, annotations, training runs

## 5A. Comprehensive Grading System Design

### 5A.1 Exam Paper Setting Module

**Teacher's Role:**

- Create exam questions within the system:
  - Multiple-choice questions (MCQs)
  - Short-answer questions
  - Essay questions
  - Problem-solving questions
- Define metadata: subject, difficulty level, marks allocation
- Tag questions with learning outcomes and topics

**System's Role:**

- Provide structured interface for question entry
- Support question banks for reuse and sharing
- Allow template creation for common exam formats
- Store questions with versioning and metadata
- Enable question preview and formatting

**Key Features:**

- Drag-and-drop question builder
- Rich text editor for question formatting
- Support for mathematical equations (LaTeX/MathML)
- Image and diagram insertion
- Question randomization options

### 5A.2 Marking Guide Generator

**Teacher's Role:**

- Provide expected responses or model answers for each question
- Define detailed scoring rubrics:
  - Full marks criteria for complete answers
  - Partial marks criteria for partial correctness
  - Common mistakes and their penalties
- Specify marking preferences (strict vs. lenient)
- Add notes for subjective questions

**System's Role:**

- Convert teacher input into structured digital marking guide
- Standardize rubrics for consistency across scripts
- Support flexible rubrics for subjective questions (essays, open-ended)
- Store marking guides with version control
- Allow export/import of marking guides

**Rubric Components:**

- Point allocation per answer component
- Key phrases or concepts required
- Acceptable variations in responses
- Common errors and deductions
- Partial credit breakdown

### 5A.3 Training with Sample Marked Scripts

**Teacher's Role:**

- Manually grade a small set of student scripts (typically 10–20)
- Apply marking guide consistently across sample scripts
- Provide detailed annotations and feedback
- Upload marked scripts into the system
- Review model's interpretation of grading style

**System's Role:**

- Accept uploaded marked scripts (scanned PDFs or images)
- Extract teacher annotations and scores using OCR and image processing
- Train grading model using the sample marked scripts:
  - Learn teacher's grading style (strict vs. lenient)
  - Capture nuances: partial credit patterns, emphasis on reasoning, writing style preferences
  - Identify patterns in how teacher weights different answer components
- Provide training summary and confidence metrics
- Allow teachers to preview model behavior before full deployment

**Training Features:**

- Minimum sample size recommendations based on question types
- Quality checks on sample consistency
- Model performance metrics on training set
- Visualization of learned grading patterns
- Iterative training with additional samples

### 5A.4 Automated Grading of Remaining Scripts

**Teacher's Role:**

- Submit remaining students' unmarked scripts (bulk upload)
- Review grading queue status
- Monitor grading progress

**System's Role:**

- Process uploaded scripts through image pipeline:
  - De-skew and rotation correction
  - Template alignment and region detection
  - OCR and handwriting recognition
- Apply trained grading model to each script:
  - Compare student responses against marking guide
  - Apply learned grading patterns from sample scripts
  - Assign scores consistent with teacher's style
  - Calculate confidence scores for each graded question
- Generate detailed feedback for each student:
  - Identify correct and incorrect components
  - Provide specific feedback based on marking guide
  - Highlight areas for improvement
- Produce graded scripts with annotations

**Grading Features:**

- Batch processing with progress tracking
- Parallel processing for scalability
- Confidence thresholds for flagging uncertain grades
- Support for multiple question types in single exam
- Consistency checks across student scripts

### 5A.5 Review & Adjustment Module

**Teacher's Role:**

- Audit automatically graded scripts (especially low-confidence ones)
- Review side-by-side comparisons:
  - Original student response
  - Model's grading and reasoning
  - Suggested score and feedback
- Override grades when necessary
- Provide corrections to improve model accuracy
- Retrain or fine-tune model with corrections

**System's Role:**

- Provide audit dashboard with filtering options:
  - By confidence score
  - By student performance
  - By question difficulty
  - Random sampling
- Display side-by-side comparison tools
- Track teacher overrides and corrections
- Update grading model with teacher feedback:
  - Incremental learning from corrections
  - Model refinement without full retraining
- Maintain audit trail of all changes
- Generate model improvement reports

**Review Features:**

- Smart prioritization (low-confidence scripts first)
- Bulk approval for high-confidence grades
- Quick override interface
- Annotation tools for teacher comments
- Comparison with similar student responses

### 5A.6 Reporting & Analytics Module

**Teacher's Role:**

- Interpret results and performance trends
- Share reports with students and administrators
- Identify areas for curriculum improvement

**System's Role:**

- Generate comprehensive reports:
  - Per-student score sheets with detailed breakdowns
  - Per-class summaries and statistics
  - Grade distributions and histograms
  - Question-level difficulty analysis
  - Common mistakes and weak areas identification
- Provide interactive dashboards:
  - Performance trends over time
  - Comparison across sections/classes
  - Correlation between question types and performance
- Export options: CSV, XLSX, PDF
- Automated insights and recommendations

**Analytics Features:**

- Grade distribution visualizations
- Performance trends and patterns
- Question difficulty metrics
- Student progress tracking
- Comparative analytics across exams
- Predictive analytics for at-risk students

### 5A.7 Grading System Workflow Summary

| Step              | Teacher Role                         | System Role                       |
| ----------------- | ------------------------------------ | --------------------------------- |
| 1. Set Exam       | Create questions with metadata       | Store exam paper in question bank |
| 2. Marking Guide  | Provide expected answers and rubrics | Build structured marking guide    |
| 3. Train Model    | Mark sample scripts (10–20)          | Learn grading style and patterns  |
| 4. Submit Scripts | Upload remaining student work        | Auto-grade using trained model    |
| 5. Review         | Audit and adjust grades              | Update model with corrections     |
| 6. Report         | Interpret results                    | Generate analytics and insights   |

### 5A.8 System Benefits

**Efficiency:**

- Saves significant time by automating bulk grading
- Reduces repetitive manual grading tasks
- Enables faster feedback to students

**Consistency:**

- Reduces human bias and grading fatigue
- Applies marking guide uniformly
- Maintains consistent standards across all scripts

**Flexibility:**

- Teachers remain in full control of grading style
- Supports various question types and formats
- Adapts to individual teacher preferences

**Scalability:**

- Works efficiently for large classes (100+ students)
- Handles multiple exam formats simultaneously
- Supports multiple courses and teachers

**Transparency:**

- Students receive clear, detailed feedback
- Grading aligned with published marking guides
- Audit trail for accountability
- Explainable AI provides grading rationale

**Quality:**

- Confidence scoring highlights uncertain grades
- Teacher review ensures accuracy
- Continuous improvement through feedback
- Maintains high grading standards

### 5A.9 Technical Implementation Notes

**Machine Learning Approach:**

- Hybrid architecture: text similarity + classification per question
- Transfer learning from pre-trained handwriting models
- Small-data fine-tuning (10–50 annotated sheets per teacher)
- Per-template or per-teacher model variants
- Ensemble methods for improved accuracy

**Confidence Scoring:**

- Multi-level confidence thresholds:
  - High confidence (≥95%): auto-approve
  - Medium confidence (80-95%): flag for quick review
  - Low confidence (<80%): require detailed teacher review
- Feature-based confidence estimation
- Uncertainty quantification

**Human-in-the-Loop:**

- Teacher approval gates for low-confidence grades
- Active learning: prioritize uncertain cases for teacher feedback
- Continuous model refinement with teacher corrections
- Fallback to manual grading when confidence is too low

**Model Performance Targets:**

- Accuracy: ≥95% for MCQs after teacher fine-tuning
- Accuracy: ≥85% for short-answer questions
- Partial credit accuracy: ≥80% alignment with teacher scoring
- Free-text answers: confidence-based teacher review required

### 5A.10 Integration with Existing Modules

This grading system integrates with:

- **Annotation UI (5.3):** Used for marking sample scripts
- **Image Processing & OCR Pipeline (5.4):** Processes student scripts
- **ML & Grading Engine (5.5):** Core AI training and inference
- **Marking & PDF Generation (5.6):** Produces marked scripts
- **Reporting & Analytics (5.8):** Generates performance reports
- **User & Identity Module (5.1):** Role-based access and permissions

  5.2 Template & Asset Management

- Upload and version blank answer templates and answer keys
- Define answer regions (bounding boxes, question types, metadata)
- Store template metadata and thumbnails in S3 and DB

  5.3 Annotation UI (Training Input)

- Web-based canvas allowing pen/mouse strokes, text comments, and per-question correctness flags
- Capture structured labels (question-level correctness, partial credit, comments)
- Export annotations as structured JSON (with image coordinates) for ML training

  5.4 Image Processing & OCR Pipeline

- Preprocessing: de-skew, rotation correction, noise reduction, contrast normalization (OpenCV)
- Template alignment: detect key markers, map scanned sheet to template coordinates
- Crop answer regions, normalize sizes, and pass to OCR or handwriting recognition models
- OCR/HTR: handwriting-optimized recognition (Tesseract fine-tune, Rosetta-style HTR, or custom CNN+RNN)

  5.5 Machine Learning & Grading Engine

- Data preparation: pair OCR/feature outputs with teacher labels
- Model types: hybrid architecture combining sequence/text similarity and classification per-question
- Training orchestration: small-batch fine-tuning per-class/teacher; store model artifact per-teacher or per-template
- Inference: deterministic scoring, probability/confidence output per question, and ensemble fallback
- Explainability: store model rationale (e.g., top features, confidence) to help teacher review

  5.6 Marking & PDF Generation

- Produce red-overlay annotations matching teacher style (font, stroke thickness)
- Rasterize overlay onto original scanned image at high DPI
- Generate print-ready PDF per student with metadata footer (score breakdown, confidence indicators)

  5.7 Printer Integration & Print Management

- Printer driver/API adapter: support cloud-print, IPP, or local network printers behind a secure gateway
- Print job queue, retry logic, and status reporting

  5.8 Reporting & Analytics

- Per-student score sheets, per-class summaries, distribution charts, question-level difficulty
- Export CSV / XLSX and dashboard visualizations

  5.9 Storage & Persistence

- S3: raw scans, thumbnails, PDFs, model artifacts
- Database: MongoDB/DocumentDB for metadata, Prisma mapping layer for relational-like behavior where needed
- Short-term cache and queues: Redis (for job state, inference cache)

  5.10 Security & Compliance

- Encryption at rest (S3 KMS) and in transit (TLS)
- Fine-grained IAM policies and Cognito groups
- Logging (CloudTrail-style), access audit, and data retention policies

## 6. Data & API Contracts (minimal examples)

Data shapes (examples):

- Template: { id, name, version, regions: [{ id, bbox, questionType, points }] }
- Annotation: { sheetId, templateId, teacherId, strokes: [...], questionLabels: [{regionId, correctness, score, comment}] }
- GradingResult: { sheetId, studentId, totalScore, perQuestion: [{regionId, predictedCorrect, confidence, assignedScore}], modelVersion }

Key REST/GraphQL endpoints (examples):

- POST /api/templates -> upload template
- GET /api/templates/{id} -> template metadata
- POST /api/annotations -> save teacher annotation
- POST /api/train -> trigger training (params: templateId, teacherId, sampleIds)
- POST /api/grade/batch -> submit batch for grading
- GET /api/results/{sheetId} -> get graded result and PDF URL

## 7. ML Pipeline Design (implementation guidance)

- Small-data fine-tuning: assume 10–50 annotated sheets per teacher; use transfer learning from a general handwriting model.
- Per-template models: maintain a model per template or share a base model with teacher-specific heads.
- Validation: cross-validation on the annotated set; surface confidence thresholds and a human-in-the-loop review for low-confidence cases.
- Retraining cadence: allow scheduled retrain when cumulative new annotations exceed a threshold.

## 8. Image/OCR Considerations

- Use adaptive preprocessing based on paper quality and scanner profile.
- Provide a scanner calibration wizard and device profiles to improve OCR accuracy.
- Maintain an error log for OCR failures and surface to teacher for correction and further training.

## 9. Non-Functional Requirements (expanded)

- Accuracy: target ≥95% on average for MCQs after teacher fine-tuning; for free-text answers provide confidence bands and require teacher review above configurable thresholds.
- Latency: inference service aim: <5s per sheet for grading (batch parallelization allowed); end-to-end <60s is a post-training target.
- Throughput & Scalability: scale ML inference horizontally (Kubernetes/ECS). Use S3 + message queues (SQS) for ingestion.
- Availability & SLA: target 99.9% for UI and grading APIs; design for graceful degradation (queueing) for heavy ML workloads.
- Privacy: support data retention policies and deletion requests; anonymize where feasible.

## 10. Testing & Validation

- Unit tests for API and image-processing functions.
- Integration tests: annotation -> training -> inference -> PDF generation pipeline on sample datasets.
- ML tests: model performance metrics, regression tests, and automated evaluation on holdout sets.
- User acceptance: small pilot with 3–5 teachers and iterative feedback.

## 11. Deployment & CI/CD

- Infrastructure as code (Terraform or AWS CDK) for networking, S3, Cognito, RDS/DocumentDB, and compute.
- CI: run unit, lint, and integration tests; CD: automated canary deploys of backend and ML service artifacts.

## 12. Monitoring & Observability

- Collect metrics: request latency, job queue depth, OCR error rates, model confidence distributions.
- Alerts for error spikes and model drift; periodic reports for retraining triggers.

## 13. Roadmap & Open Improvements

- Support collaborative grading and shared model artifacts across teachers.
- Improve handwriting HTR model with active learning and teacher corrections.
- Add role-based dashboards and automated insights (question-wise difficulty).
- Integrate with LMS (Canvas, Moodle) for roster and gradebook sync.

## 13A. UI/UX Design Considerations

### 13A.1 Design Principles

**Simplicity:**

- Clean, uncluttered interfaces
- Intuitive navigation with minimal learning curve
- Consistent design patterns across all screens

**Role-Based Experience:**

- Customized dashboards per user role
- Context-aware navigation and quick actions
- Role-specific color coding and visual cues

**Responsiveness:**

- Mobile-friendly design for students and parents
- Tablet-optimized for teachers doing reviews
- Desktop-optimized for content creation and administration

**Accessibility:**

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color-blind friendly palettes

### 13A.2 Key UI Components

**Card-Based Layouts:**

- Course cards on student dashboard showing progress
- Exam paper cards on faculty dashboard
- Analytics cards with key metrics

**Data Visualizations:**

- Interactive charts for grade distributions
- Progress bars for course completion
- Heatmaps for question difficulty analysis

**Notification System:**

- Real-time notifications for submissions, grades, announcements
- Notification center with filtering and priority levels
- Email and in-app notification preferences

**Search & Filtering:**

- Global search across courses, assignments, students
- Advanced filtering for reports and analytics
- Saved filter presets

### 13A.3 Grading UI Specifics

**Exam Paper Setting Interface:**

- Drag-and-drop question builder
- Split-view: question editor + preview
- Question library with search and tagging

**Sample Script Marking Interface:**

- High-resolution image viewer with zoom/pan
- Annotation tools (pen, highlighter, text, stamps)
- Side panel for scoring and rubric reference
- Progress tracker across sample scripts

**Auto-Grading Review Interface:**

- Split view: student response + model grading
- Confidence indicator with color coding
- One-click approve/override actions
- Batch operations for high-confidence grades

**Analytics Dashboard:**

- Interactive charts with drill-down capability
- Filter by course, exam, student cohort
- Export options for presentations
- Scheduled report generation

## 14. Acceptance Criteria

**Core Grading System:**

- End-to-end grading pipeline works on a representative dataset and produces PDFs matching teacher annotations.
- Exam paper setting module allows creation of multi-format questions with marking guides.
- Training module successfully learns from 10-20 sample marked scripts.
- Automated grading achieves ≥95% accuracy on MCQs and ≥85% on short answers.
- Review interface enables efficient audit and override of auto-graded scripts.

**User Roles & Access:**

- All six user roles (Student, Faculty, Administrator, Support Staff, Parent, Alumni/Guest) implemented with proper authentication and authorization.
- Role-based access control (RBAC) enforces appropriate permissions.
- Users can perform all actions specified for their role.

**User Interface:**

- All specified screens implemented for each user role.
- Navigation is intuitive and consistent across the application.
- Responsive design works on desktop, tablet, and mobile devices.
- Accessibility standards (WCAG 2.1 AA) are met.

**Reporting & Analytics:**

- Comprehensive reports available for students, faculty, and administrators.
- Interactive dashboards with filtering and drill-down capabilities.
- Export functionality for CSV, XLSX, and PDF formats.
- Real-time performance metrics and grade distributions.

**System Quality:**

- System can be deployed to AWS with automated scripts and includes basic CI for tests.
- Performance targets met: <5s per sheet grading, 99.9% availability.
- Security requirements satisfied: encryption at rest and in transit, audit logging.
- Pilot teachers confirm usability of annotation UI and grading accuracy meets thresholds.

## 15. Next Steps (practical)

**Phase 1: User Management & Core Infrastructure (Weeks 1-2)**

1. Implement authentication and role-based access control for all six user roles.
2. Set up user management interfaces for administrators.
3. Create basic dashboard layouts for each user role.

**Phase 2: Course Management & Content (Weeks 3-4)** 4. Implement course catalog and enrollment management. 5. Build content creation and management tools for faculty. 6. Develop student course access and materials viewing.

**Phase 3: Grading System Foundation (Weeks 5-6)** 7. Build exam paper setting module with question builder. 8. Implement marking guide generator. 9. Create annotation UI for sample script marking.

**Phase 4: ML Training & Auto-Grading (Weeks 7-9)** 10. Develop image processing and OCR pipeline. 11. Implement ML training pipeline for grading models. 12. Build automated grading engine with confidence scoring.

**Phase 5: Review & Reporting (Weeks 10-11)** 13. Create review interface for teacher audit and override. 14. Implement comprehensive reporting and analytics dashboards. 15. Build export functionality and scheduled reports.

**Phase 6: Testing & Pilot (Weeks 12-14)** 16. Capture real sample templates and 20 annotated sheets for initial pilot dataset. 17. Conduct end-to-end testing with all user roles. 18. Run 2-week pilot with 3-5 teachers and iterate on UX and model performance. 19. Gather feedback and implement critical improvements.

**Phase 7: Additional Features (Weeks 15-16)** 20. Implement payment and billing for students. 21. Add parent/guardian and alumni portals. 22. Integrate discussion forums and messaging. 23. Final security audit and performance optimization.

---

**Document Status:** Comprehensive specification covering user roles, UI screens, and detailed grading system design.

Requirements coverage: all requirements from `PSD.md` are included and expanded; detailed user roles, actions, UI screens, and comprehensive grading system workflow are documented. The document is intentionally open for iterative improvements and implementation-level decisions.

If you'd like, I can now:

- generate a one-page architecture diagram (textual),
- scaffold the repository (frontend/back-end/ML) with minimal starter code, or
- create a prioritized implementation backlog from the roadmap above.
