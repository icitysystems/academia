import React, { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
	EXPORT_LESSON_REPORT,
	GET_MY_SCHOOLS,
	GET_MY_CLASSES,
} from "../../graphql/lessons/queries";
import "./ReportExporter.css";

type ExportFormat = "PDF" | "EXCEL" | "CSV";

interface ReportExporterProps {
	onClose?: () => void;
	defaultSchoolId?: string;
	defaultClassId?: string;
	defaultClassSubjectId?: string;
}

export const ReportExporter: React.FC<ReportExporterProps> = ({
	onClose,
	defaultSchoolId,
	defaultClassId,
	defaultClassSubjectId,
}) => {
	// Form state
	const [schoolId, setSchoolId] = useState(defaultSchoolId || "");
	const [classId, setClassId] = useState(defaultClassId || "");
	const [classSubjectId, setClassSubjectId] = useState(
		defaultClassSubjectId || ""
	);
	const [dateFrom, setDateFrom] = useState(() => {
		const date = new Date();
		date.setMonth(date.getMonth() - 1);
		return date.toISOString().split("T")[0];
	});
	const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
	const [format, setFormat] = useState<ExportFormat>("PDF");
	const [isExporting, setIsExporting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Queries
	const { data: schoolsData } = useQuery(GET_MY_SCHOOLS);
	const { data: classesData } = useQuery(GET_MY_CLASSES);

	// Mutation
	const [exportReport] = useMutation(EXPORT_LESSON_REPORT);

	// Get classes for selected school
	const filteredClasses =
		classesData?.myClasses?.filter(
			(cls: any) => !schoolId || cls.school?.id === schoolId
		) || [];

	// Get subjects for selected class
	const selectedClass = filteredClasses.find((cls: any) => cls.id === classId);
	const subjects = selectedClass?.subjects || [];

	const handleExport = async () => {
		setIsExporting(true);
		setError(null);

		try {
			const { data } = await exportReport({
				variables: {
					input: {
						schoolId: schoolId || undefined,
						classId: classId || undefined,
						classSubjectId: classSubjectId || undefined,
						dateFrom: new Date(dateFrom),
						dateTo: new Date(dateTo),
						format,
					},
				},
			});

			const reportData = data?.exportLessonReport;

			if (reportData) {
				downloadReport(reportData, format);
			}
		} catch (err: any) {
			setError(err.message || "Failed to export report");
		} finally {
			setIsExporting(false);
		}
	};

	const downloadReport = (content: string, format: ExportFormat) => {
		let blob: Blob;
		let filename: string;
		const timestamp = new Date().toISOString().split("T")[0];

		switch (format) {
			case "CSV":
				blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
				filename = `lesson-report-${timestamp}.csv`;
				break;
			case "EXCEL":
				// For Excel, we'll download as JSON that can be opened in Excel
				// or converted on the client side using a library
				blob = new Blob([content], { type: "application/json" });
				filename = `lesson-report-${timestamp}.json`;
				break;
			case "PDF":
			default:
				// For PDF, generate HTML that can be printed
				const reportObj = JSON.parse(content);
				const htmlContent = generatePDFHTML(reportObj);
				blob = new Blob([htmlContent], { type: "text/html" });
				filename = `lesson-report-${timestamp}.html`;
				break;
		}

		// Create download link
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const generatePDFHTML = (reportData: any): string => {
		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Lesson Tracking Report</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
		h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
		h2 { color: #555; margin-top: 30px; }
		.summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
		.summary-item { display: inline-block; margin-right: 40px; }
		.summary-label { color: #666; font-size: 14px; }
		.summary-value { font-size: 24px; font-weight: bold; color: #4f46e5; }
		table { width: 100%; border-collapse: collapse; margin-top: 20px; }
		th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
		th { background: #4f46e5; color: white; }
		tr:nth-child(even) { background: #f9f9f9; }
		.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
		@media print {
			body { margin: 20px; }
			button { display: none; }
		}
	</style>
</head>
<body>
	<button onclick="window.print()" style="float:right; padding: 10px 20px; cursor:pointer;">Print PDF</button>
	<h1>📚 Lesson Tracking Report</h1>
	
	<div class="summary">
		<div class="summary-item">
			<div class="summary-label">Total Lessons</div>
			<div class="summary-value">${reportData.summary.totalLessons}</div>
		</div>
		<div class="summary-item">
			<div class="summary-label">Total Hours</div>
			<div class="summary-value">${reportData.summary.totalHours}</div>
		</div>
		<div class="summary-item">
			<div class="summary-label">Topics Covered</div>
			<div class="summary-value">${reportData.summary.uniqueTopicsCovered}</div>
		</div>
	</div>

	<p><strong>Period:</strong> ${new Date(reportData.period.from).toLocaleDateString()} - ${new Date(reportData.period.to).toLocaleDateString()}</p>
	<p><strong>Generated:</strong> ${new Date(reportData.generatedAt).toLocaleString()}</p>

	<h2>Subject Breakdown</h2>
	<table>
		<thead>
			<tr>
				<th>Subject</th>
				<th>Lessons</th>
				<th>Hours</th>
			</tr>
		</thead>
		<tbody>
			${reportData.summary.subjectBreakdown
				.map(
					(s: any) => `
				<tr>
					<td>${s.name}</td>
					<td>${s.lessons}</td>
					<td>${s.hours}</td>
				</tr>
			`
				)
				.join("")}
		</tbody>
	</table>

	<h2>Lesson Details</h2>
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Subject</th>
				<th>Class</th>
				<th>Duration</th>
				<th>Method</th>
				<th>Topics</th>
				<th>Status</th>
			</tr>
		</thead>
		<tbody>
			${reportData.lessons
				.map(
					(l: any) => `
				<tr>
					<td>${new Date(l.date).toLocaleDateString()}</td>
					<td>${l.subject}</td>
					<td>${l.class}</td>
					<td>${l.duration} hrs</td>
					<td>${l.method}</td>
					<td>${l.topicsCovered.slice(0, 3).join(", ")}${l.topicsCovered.length > 3 ? "..." : ""}</td>
					<td>${l.status}</td>
				</tr>
			`
				)
				.join("")}
		</tbody>
	</table>

	<div class="footer">
		<p>Generated by Academia Lesson Tracking System</p>
	</div>
</body>
</html>`;
	};

	return (
		<div className="report-exporter">
			<div className="report-exporter__header">
				<h3>📊 Export Lesson Report</h3>
				{onClose && (
					<button
						type="button"
						className="report-exporter__close"
						onClick={onClose}
					>
						×
					</button>
				)}
			</div>

			<div className="report-exporter__content">
				{error && <div className="report-exporter__error">{error}</div>}

				<div className="report-exporter__section">
					<h4>Filter Scope</h4>
					<p className="report-exporter__hint">
						Leave empty to include all data
					</p>

					<div className="report-exporter__row">
						<div className="report-exporter__field">
							<label>School</label>
							<select
								value={schoolId}
								onChange={(e) => {
									setSchoolId(e.target.value);
									setClassId("");
									setClassSubjectId("");
								}}
							>
								<option value="">All Schools</option>
								{schoolsData?.mySchools?.map((school: any) => (
									<option key={school.id} value={school.id}>
										{school.name}
									</option>
								))}
							</select>
						</div>

						<div className="report-exporter__field">
							<label>Class</label>
							<select
								value={classId}
								onChange={(e) => {
									setClassId(e.target.value);
									setClassSubjectId("");
								}}
							>
								<option value="">All Classes</option>
								{filteredClasses.map((cls: any) => (
									<option key={cls.id} value={cls.id}>
										{cls.name}
									</option>
								))}
							</select>
						</div>

						<div className="report-exporter__field">
							<label>Subject</label>
							<select
								value={classSubjectId}
								onChange={(e) => setClassSubjectId(e.target.value)}
								disabled={!classId}
							>
								<option value="">All Subjects</option>
								{subjects.map((sub: any) => (
									<option key={sub.id} value={sub.id}>
										{sub.subject.name}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				<div className="report-exporter__section">
					<h4>Date Range</h4>
					<div className="report-exporter__row">
						<div className="report-exporter__field">
							<label>From</label>
							<input
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
								required
							/>
						</div>
						<div className="report-exporter__field">
							<label>To</label>
							<input
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
								required
							/>
						</div>
					</div>
				</div>

				<div className="report-exporter__section">
					<h4>Export Format</h4>
					<div className="report-exporter__formats">
						<label
							className={`report-exporter__format ${
								format === "PDF" ? "report-exporter__format--selected" : ""
							}`}
						>
							<input
								type="radio"
								name="format"
								value="PDF"
								checked={format === "PDF"}
								onChange={() => setFormat("PDF")}
							/>
							<span className="report-exporter__format-icon">📄</span>
							<span className="report-exporter__format-label">PDF</span>
							<span className="report-exporter__format-desc">
								Printable document
							</span>
						</label>

						<label
							className={`report-exporter__format ${
								format === "EXCEL" ? "report-exporter__format--selected" : ""
							}`}
						>
							<input
								type="radio"
								name="format"
								value="EXCEL"
								checked={format === "EXCEL"}
								onChange={() => setFormat("EXCEL")}
							/>
							<span className="report-exporter__format-icon">📊</span>
							<span className="report-exporter__format-label">Excel</span>
							<span className="report-exporter__format-desc">
								Spreadsheet data
							</span>
						</label>

						<label
							className={`report-exporter__format ${
								format === "CSV" ? "report-exporter__format--selected" : ""
							}`}
						>
							<input
								type="radio"
								name="format"
								value="CSV"
								checked={format === "CSV"}
								onChange={() => setFormat("CSV")}
							/>
							<span className="report-exporter__format-icon">📋</span>
							<span className="report-exporter__format-label">CSV</span>
							<span className="report-exporter__format-desc">
								Raw data export
							</span>
						</label>
					</div>
				</div>
			</div>

			<div className="report-exporter__actions">
				{onClose && (
					<button
						type="button"
						className="report-exporter__btn report-exporter__btn--secondary"
						onClick={onClose}
					>
						Cancel
					</button>
				)}
				<button
					type="button"
					className="report-exporter__btn report-exporter__btn--primary"
					onClick={handleExport}
					disabled={isExporting}
				>
					{isExporting ? (
						<>
							<span className="report-exporter__spinner"></span>
							Generating...
						</>
					) : (
						<>⬇️ Export Report</>
					)}
				</button>
			</div>
		</div>
	);
};

export default ReportExporter;
