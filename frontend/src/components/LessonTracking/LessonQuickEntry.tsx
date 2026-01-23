import React, { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
	CREATE_LESSON,
	GET_MY_CLASSES,
	GET_CLASS,
	GET_SYLLABI,
	GET_DASHBOARD_SUMMARY,
} from "../../graphql/lessons/queries";
import "./LessonQuickEntry.css";

// Teaching method options
const TEACHING_METHODS = [
	{ value: "LECTURE", label: "📚 Lecture" },
	{ value: "DISCUSSION", label: "💬 Discussion" },
	{ value: "GROUP_WORK", label: "👥 Group Work" },
	{ value: "PRACTICAL", label: "🔬 Practical" },
	{ value: "DEMONSTRATION", label: "🎬 Demonstration" },
	{ value: "ASSESSMENT", label: "📝 Assessment" },
	{ value: "REVISION", label: "🔄 Revision" },
	{ value: "OTHER", label: "📋 Other" },
];

interface LessonQuickEntryProps {
	onSuccess?: (lesson: any) => void;
	onCancel?: () => void;
	defaultClassId?: string;
	defaultSubjectId?: string;
	compact?: boolean;
}

interface Topic {
	id: string;
	name: string;
	chapter?: {
		id: string;
		name: string;
		unit?: {
			id: string;
			name: string;
		};
	};
}

interface Subject {
	id: string;
	subject: {
		id: string;
		name: string;
	};
	syllabus?: {
		id: string;
		units: Array<{
			id: string;
			name: string;
			chapters: Array<{
				id: string;
				name: string;
				topics: Topic[];
			}>;
		}>;
	};
}

export const LessonQuickEntry: React.FC<LessonQuickEntryProps> = ({
	onSuccess,
	onCancel,
	defaultClassId,
	defaultSubjectId,
	compact = false,
}) => {
	// Form state
	const [classId, setClassId] = useState(defaultClassId || "");
	const [classSubjectId, setClassSubjectId] = useState(defaultSubjectId || "");
	const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
	const [duration, setDuration] = useState(1);
	const [teachingMethod, setTeachingMethod] = useState("LECTURE");
	const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
	const [notes, setNotes] = useState("");
	const [objectives, setObjectives] = useState("");
	const [showAdvanced, setShowAdvanced] = useState(false);

	// Queries
	const { data: classesData } = useQuery(GET_MY_CLASSES);
	const { data: classData } = useQuery(GET_CLASS, {
		variables: { id: classId },
		skip: !classId,
	});
	const { data: syllabiData } = useQuery(GET_SYLLABI, {
		variables: { classSubjectId },
		skip: !classSubjectId,
	});

	// Mutation
	const [createLesson, { loading }] = useMutation(CREATE_LESSON, {
		refetchQueries: [{ query: GET_DASHBOARD_SUMMARY }],
		onCompleted: (data) => {
			onSuccess?.(data.createLesson);
			resetForm();
		},
	});

	const resetForm = () => {
		if (!defaultClassId) setClassId("");
		if (!defaultSubjectId) setClassSubjectId("");
		setDate(new Date().toISOString().split("T")[0]);
		setDuration(1);
		setTeachingMethod("LECTURE");
		setSelectedTopics([]);
		setNotes("");
		setObjectives("");
		setShowAdvanced(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!classId || !classSubjectId || selectedTopics.length === 0) {
			alert("Please select a class, subject, and at least one topic");
			return;
		}

		try {
			await createLesson({
				variables: {
					input: {
						classId,
						classSubjectId,
						date: new Date(date),
						duration,
						teachingMethod,
						topicIds: selectedTopics,
						notes: notes || undefined,
						objectives: objectives || undefined,
						status: "COMPLETED",
					},
				},
			});
		} catch (error) {
			console.error("Error creating lesson:", error);
			alert("Failed to create lesson. Please try again.");
		}
	};

	const handleTopicToggle = (topicId: string) => {
		setSelectedTopics((prev) =>
			prev.includes(topicId)
				? prev.filter((id) => id !== topicId)
				: [...prev, topicId]
		);
	};

	// Get subjects for selected class
	const subjects: Subject[] = classData?.class?.subjects || [];

	// Get available topics from syllabus
	const getAllTopics = (): Topic[] => {
		// Get syllabus from the syllabi query
		const syllabi = syllabiData?.syllabi || [];
		const syllabus = syllabi[0]; // Get the first syllabus for this classSubject

		if (!syllabus) return [];

		const topics: Topic[] = [];
		syllabus.units?.forEach((unit: any) => {
			unit.topics?.forEach((topic: any) => {
				topics.push({
					id: topic.id,
					name: topic.title || topic.name,
					chapter: {
						id: unit.id,
						name: unit.title || unit.name,
						unit: {
							id: unit.id,
							name: unit.title || unit.name,
						},
					},
				});
			});
		});
		return topics;
	};

	const availableTopics = getAllTopics();

	return (
		<div className={`quick-entry ${compact ? "quick-entry--compact" : ""}`}>
			<div className="quick-entry__header">
				<h3>⚡ Quick Lesson Entry</h3>
				{onCancel && (
					<button
						type="button"
						className="quick-entry__close"
						onClick={onCancel}
					>
						×
					</button>
				)}
			</div>

			<form onSubmit={handleSubmit} className="quick-entry__form">
				<div className="quick-entry__row">
					{/* Class Selection */}
					<div className="quick-entry__field">
						<label>Class</label>
						<select
							value={classId}
							onChange={(e) => {
								setClassId(e.target.value);
								setClassSubjectId("");
								setSelectedTopics([]);
							}}
							required
						>
							<option value="">Select Class</option>
							{classesData?.myClasses?.map((cls: any) => (
								<option key={cls.id} value={cls.id}>
									{cls.name} ({cls.school?.name})
								</option>
							))}
						</select>
					</div>

					{/* Subject Selection */}
					<div className="quick-entry__field">
						<label>Subject</label>
						<select
							value={classSubjectId}
							onChange={(e) => {
								setClassSubjectId(e.target.value);
								setSelectedTopics([]);
							}}
							disabled={!classId}
							required
						>
							<option value="">Select Subject</option>
							{subjects.map((sub) => (
								<option key={sub.id} value={sub.id}>
									{sub.subject.name}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="quick-entry__row">
					{/* Date */}
					<div className="quick-entry__field">
						<label>Date</label>
						<input
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							required
						/>
					</div>

					{/* Duration */}
					<div className="quick-entry__field quick-entry__field--small">
						<label>Duration (hrs)</label>
						<div className="quick-entry__duration">
							<button
								type="button"
								onClick={() => setDuration(Math.max(0.5, duration - 0.5))}
							>
								−
							</button>
							<span>{duration}</span>
							<button
								type="button"
								onClick={() => setDuration(Math.min(8, duration + 0.5))}
							>
								+
							</button>
						</div>
					</div>

					{/* Teaching Method */}
					<div className="quick-entry__field">
						<label>Method</label>
						<select
							value={teachingMethod}
							onChange={(e) => setTeachingMethod(e.target.value)}
						>
							{TEACHING_METHODS.map((method) => (
								<option key={method.value} value={method.value}>
									{method.label}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Topics Selection */}
				{classSubjectId && (
					<div className="quick-entry__field quick-entry__field--topics">
						<label>
							Topics Covered
							<span className="quick-entry__count">
								({selectedTopics.length} selected)
							</span>
						</label>
						<div className="quick-entry__topics">
							{availableTopics.length === 0 ? (
								<p className="quick-entry__empty">
									No syllabus topics available. Create a syllabus first.
								</p>
							) : (
								availableTopics.map((topic) => (
									<label
										key={topic.id}
										className={`quick-entry__topic ${
											selectedTopics.includes(topic.id)
												? "quick-entry__topic--selected"
												: ""
										}`}
									>
										<input
											type="checkbox"
											checked={selectedTopics.includes(topic.id)}
											onChange={() => handleTopicToggle(topic.id)}
										/>
										<span className="quick-entry__topic-name">
											{topic.name}
										</span>
										<span className="quick-entry__topic-path">
											{topic.chapter?.unit?.name} › {topic.chapter?.name}
										</span>
									</label>
								))
							)}
						</div>
					</div>
				)}

				{/* Advanced Options Toggle */}
				<button
					type="button"
					className="quick-entry__toggle"
					onClick={() => setShowAdvanced(!showAdvanced)}
				>
					{showAdvanced ? "▼ Hide" : "▶ Show"} Additional Details
				</button>

				{/* Advanced Options */}
				{showAdvanced && (
					<div className="quick-entry__advanced">
						<div className="quick-entry__field">
							<label>Objectives</label>
							<textarea
								value={objectives}
								onChange={(e) => setObjectives(e.target.value)}
								placeholder="What were the learning objectives?"
								rows={2}
							/>
						</div>
						<div className="quick-entry__field">
							<label>Notes</label>
							<textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Any notes about the lesson?"
								rows={2}
							/>
						</div>
					</div>
				)}

				{/* Actions */}
				<div className="quick-entry__actions">
					{onCancel && (
						<button
							type="button"
							className="quick-entry__btn quick-entry__btn--secondary"
							onClick={onCancel}
						>
							Cancel
						</button>
					)}
					<button
						type="submit"
						className="quick-entry__btn quick-entry__btn--primary"
						disabled={
							loading ||
							!classId ||
							!classSubjectId ||
							selectedTopics.length === 0
						}
					>
						{loading ? "Saving..." : "✓ Save Lesson"}
					</button>
				</div>
			</form>
		</div>
	);
};

export default LessonQuickEntry;
