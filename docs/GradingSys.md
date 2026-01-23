# Specification Document: ML-Powered Grading System Web App (AWS)

**Document Version:** 2.0  
**Last Updated:** January 21, 2026  
**Status:** Partially Implemented (Web App Complete, ML Simulated)

---

## Implementation Status

| Component           | Specified | Implemented  | Gap                    |
| ------------------- | --------- | ------------ | ---------------------- |
| Frontend (React)    | ✅        | ✅ Complete  | -                      |
| Backend (NestJS)    | ✅        | ✅ Complete  | -                      |
| GraphQL API         | ✅        | ✅ Complete  | -                      |
| Template Management | ✅        | ✅ Complete  | -                      |
| Annotation UI       | ✅        | ✅ Complete  | -                      |
| Training Workflow   | ✅        | ✅ Complete  | -                      |
| ML Model (Python)   | ✅        | ⚠️ Simulated | JavaScript heuristics  |
| OCR Engine          | ✅        | ⚠️ Simulated | Placeholder data       |
| PDF Generation      | ✅        | ✅ Complete  | -                      |
| AWS Deployment      | ✅        | ✅ Complete  | S3, CloudFront, Lambda |
| Printer Integration | ✅        | ❌ Not Done  | Requires hardware      |

> **Note:** See `backend/src/ml/ml.service.ts` for current grading logic. Replace with Python ML service for production accuracy targets.

---

## 1. Introduction

This system is a web application designed to automate the grading of handwritten student answer sheets using machine learning. It learns from a teacher’s manual grading on a sample set, then applies the learned logic to grade the rest, generating printable marked scripts. The solution aims for high accuracy and personalization, adapting to each teacher’s assessment style.

## 2. System Overview

The system operates in four main phases:

- **Training Phase:** Teacher uploads and manually marks a subset of answer sheets.
- **Learning Phase:** The system trains a model based on the teacher’s markings.
- **Grading Phase:** Remaining sheets are scanned, processed, and graded automatically.
- **Physical Marking Phase:** Marked scripts are generated as digital images and sent to a printer.

## 3. Functional Requirements

### 3.1 Training & Data Input

- Upload blank answer sheet templates, answer keys, and student answer sheets.
- UI for manual marking of sample scripts (digital pen/mouse).
- Store annotated training data for ML model training.

### 3.2 Image Processing & Data Extraction

- Align scanned sheets with templates (correct skew/rotation).
- Use handwriting-optimized OCR to extract answers.

### 3.3 Machine Learning & Grading Logic

- Train a model on teacher-annotated scripts to predict correctness.
- Grade multiple-choice, short-answer, and fill-in-the-blank questions.
- Apply the model to unmarked scripts and assign scores.
- Generate digital overlays of correct answers and feedback in red.

### 3.4 Physical Output & Reporting

- Generate high-resolution, printable PDFs for each marked sheet.
- Send print jobs to an integrated printer.
- Produce digital reports with student scores and class summaries.

## 4. Non-Functional Requirements

- **Accuracy:** ≥95% after training on 10–20 scripts.
- **Performance:** <60 seconds per sheet (scan to print, post-training).
- **Scalability:** Support for large classes and multiple users.

## Grading System — Subsystems and Internal Architecture

This document describes the Grading System at subsystem level, the data flows between them, and the primary responsibilities and interfaces for each component.

## Overview

The Grading System ingests student submissions (scanned images or electronic files), extracts answers, produces ML grading suggestions, supports teacher review, and emits final grades and marked PDFs. It is composed of modular services to allow swapping the ML/OCR stack, supporting staged rollout and A/B testing.

## Core Subsystems

1. Ingestion & Job Manager

   - Responsibilities: accept uploads (bulk or single), validate files, create grading jobs, enqueue tasks for preprocessing and inference.
   - Interfaces: `POST /api/grading/jobs`, S3 upload hooks, queue events (RabbitMQ/SQS).

2. Template & Region Manager

   - Responsibilities: store blank templates, define answer regions (coordinates, types: MCQ, short text, numeric), version templates.
   - Interfaces: UI definitions stored in DB; used by preprocessing & OCR to crop regions.
   - References: frontend annotate pages for template editing.

3. Preprocessing & Alignment

   - Responsibilities: deskew, crop regions using template alignment, normalize images (binarize, resize), and prepare per-question images for OCR/feature extraction.
   - Implementation notes: OpenCV recommended for alignment and normalization.

4. OCR & Text Extraction

   - Responsibilities: run handwriting OCR (or typed text OCR) on region images and return text + confidence and character-level bounding boxes where available.
   - Interfaces: sync/async API used by Grading pipeline; fallback: manual transcription UI when OCR confidence is low.

5. Feature Extraction

   - Responsibilities: convert OCR output and visual cues into features consumed by the ML model (n-grams, edit-distance against exemplar, stroke density, numeric parsing, answer length, formatting cues).

6. ML Trainer & Model Store

   - Responsibilities: accept labeled examples (teacher-marked scripts), orchestrate training jobs, validate models on hold-out sets, and publish model versions.
   - Implementation notes: use Python (TensorFlow/PyTorch) for training; store models with metadata (version, training data id, metrics).
   - Interfaces: `POST /ml/train`, model registry for versioned inference.

7. Inference Service (Predictor)

   - Responsibilities: expose a low-latency endpoint for scoring submissions, returning per-question suggested marks, confidence, and evidence (text matches, feature highlights).
   - Interfaces: `POST /ml/predict` with model version parameter; returns structured suggestions.

8. Rule Engine & Aggregator

   - Responsibilities: apply business rules (weighting, negative marking, rounding), aggregate per-question suggestions to final score, and generate grading rationale.

9. Review UI & Human-in-the-Loop

   - Responsibilities: present suggestions, evidence, and confidence to teachers; support accept/override, bulk-accept, flagging for retrain, and comment feedback.
   - Features: bulk operations, filtering (low-confidence), audit trail for each decision.

10. PDF Marking & Export

    - Responsibilities: generate marked PDF overlays with red annotations, teacher comments and final scores; provide print-ready documents and digital reports.
    - References: `backend/src/pdf/pdf.service.ts`.

11. Printer/Hardware Connector

    - Responsibilities: send print jobs to configured printers (on-prem or cloud-print), support job status and retries.
    - Notes: hardware integration optional; provide manual download fallback.

12. Audit, Logging & Telemetry

    - Responsibilities: record model version, confidence, teacher action, timestamps, and store training provenance for audits and retraining datasets.

13. Retraining Pipeline
    - Responsibilities: collect flagged and overridden examples, curate datasets, schedule retrain jobs, validate new model, and deploy with safe rollback.

## Data Stores

- Submission storage: object store (S3) with per-file metadata.
- Annotation & labels: relational DB (Prisma) storing region-level annotations and teacher marks.
- Models & artifacts: model registry (S3 + metadata DB) with versioning.
- Audit logs: append-only store for decisions and provenance.

## Security & Permissions

- RBAC: restrict who can run auto-grades, view raw OCR text or export student data.
- Data protection: encrypt submissions at rest and in transit; anonymize examples when used for public model training.

## APIs & Integration Points

- `POST /api/grading/jobs` — create grading job (ingestion)
- `GET /api/grading/jobs/:id` — job status and results
- `POST /ml/train` — submit training dataset
- `POST /ml/predict` — request grade suggestions
- `GET /api/pdf/:submissionId` — download marked PDF

## Operational Considerations

- Monitoring: track model accuracy vs teacher grades, confidence distribution, override rates, and queue latencies.
- Rollback: provide instant switch to previous model if override rate spikes.
- Scalability: separate CPU/GPU training clusters from low-latency inference nodes.

## Code Pointers

- Current heuristic grading logic: `backend/src/ml/ml.service.ts` (prototype)
- Grading service entrypoint: `backend/src/grading/grading.service.ts`
- PDF generation: `backend/src/pdf/pdf.service.ts`
- Frontend review/UI: `frontend/src/pages/ReviewPage.tsx`, `frontend/src/pages/AnnotatePage.tsx`

## Next steps

1. Replace heuristic grader with Python ML microservice and implement OCR integration.
2. Harden retraining pipeline and model registry.
3. Implement printer connector or documented manual printing workflow.

---

This document should be used together with `docs/PSD.md` (system overview) and the code references above when planning implementation work or reviews.
