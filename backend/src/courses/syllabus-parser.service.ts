import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

// Optional dependencies - service will work in limited mode without them
let mammoth: any;
let pdfParse: any;

try {
	mammoth = require("mammoth");
} catch (e) {
	// mammoth not installed - DOCX parsing disabled
}

try {
	pdfParse = require("pdf-parse");
} catch (e) {
	// pdf-parse not installed - PDF parsing disabled
}

/**
 * Syllabus Document Parser Service
 * Parses uploaded syllabus documents (PDF/DOCX) to extract course structure
 *
 * Note: Requires optional packages:
 * - mammoth: for DOCX parsing
 * - pdf-parse: for PDF parsing
 *
 * Install with: npm install mammoth pdf-parse
 */

export interface ParsedSyllabus {
	title?: string;
	courseCode?: string;
	instructor?: string;
	term?: string;
	description?: string;
	objectives?: string[];
	modules: SyllabusModule[];
	schedule: ScheduleItem[];
	assessments: Assessment[];
	policies: Policy[];
	materials?: string[];
	prerequisites?: string[];
}

export interface SyllabusModule {
	number: number;
	title: string;
	description?: string;
	topics: string[];
	duration?: string;
	readings?: string[];
	objectives?: string[];
}

export interface ScheduleItem {
	week?: number;
	date?: string;
	topic: string;
	activities?: string[];
	assignments?: string[];
	readings?: string[];
}

export interface Assessment {
	name: string;
	type: string; // QUIZ, EXAM, ASSIGNMENT, PROJECT, PARTICIPATION
	weight: number;
	description?: string;
	dueDate?: string;
}

export interface Policy {
	name: string;
	content: string;
}

@Injectable()
export class SyllabusParserService {
	private readonly logger = new Logger(SyllabusParserService.name);

	/**
	 * Parse a syllabus document from file path
	 */
	async parseFromFile(filePath: string): Promise<ParsedSyllabus> {
		const extension = path.extname(filePath).toLowerCase();
		const buffer = fs.readFileSync(filePath);

		switch (extension) {
			case ".pdf":
				return this.parsePdf(buffer);
			case ".docx":
				return this.parseDocx(buffer);
			case ".doc":
				throw new Error(
					"Legacy .doc format not supported. Please convert to .docx or .pdf",
				);
			case ".txt":
				return this.parseText(buffer.toString("utf-8"));
			default:
				throw new Error(`Unsupported file format: ${extension}`);
		}
	}

	/**
	 * Parse a syllabus document from buffer
	 */
	async parseFromBuffer(
		buffer: Buffer,
		mimeType: string,
	): Promise<ParsedSyllabus> {
		switch (mimeType) {
			case "application/pdf":
				return this.parsePdf(buffer);
			case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
				return this.parseDocx(buffer);
			case "text/plain":
				return this.parseText(buffer.toString("utf-8"));
			default:
				throw new Error(`Unsupported mime type: ${mimeType}`);
		}
	}

	/**
	 * Parse PDF document
	 */
	private async parsePdf(buffer: Buffer): Promise<ParsedSyllabus> {
		if (!pdfParse) {
			throw new Error(
				"PDF parsing is not available. Please install pdf-parse: npm install pdf-parse",
			);
		}
		try {
			const data = await pdfParse(buffer);
			return this.parseText(data.text);
		} catch (error: any) {
			this.logger.error(`PDF parsing error: ${error.message}`);
			throw new Error(`Failed to parse PDF: ${error.message}`);
		}
	}

	/**
	 * Parse DOCX document
	 */
	private async parseDocx(buffer: Buffer): Promise<ParsedSyllabus> {
		if (!mammoth) {
			throw new Error(
				"DOCX parsing is not available. Please install mammoth: npm install mammoth",
			);
		}
		try {
			const result = await mammoth.extractRawText({ buffer });
			return this.parseText(result.value);
		} catch (error: any) {
			this.logger.error(`DOCX parsing error: ${error.message}`);
			throw new Error(`Failed to parse DOCX: ${error.message}`);
		}
	}

	/**
	 * Parse text content to extract syllabus structure
	 */
	private parseText(text: string): ParsedSyllabus {
		const lines = text
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l);
		const syllabus: ParsedSyllabus = {
			modules: [],
			schedule: [],
			assessments: [],
			policies: [],
		};

		// Extract course title (usually at the beginning)
		syllabus.title = this.extractTitle(lines);
		syllabus.courseCode = this.extractCourseCode(lines);
		syllabus.instructor = this.extractInstructor(lines);
		syllabus.term = this.extractTerm(lines);
		syllabus.description = this.extractDescription(lines);
		syllabus.objectives = this.extractObjectives(lines);
		syllabus.prerequisites = this.extractPrerequisites(lines);
		syllabus.materials = this.extractMaterials(lines);
		syllabus.modules = this.extractModules(lines);
		syllabus.schedule = this.extractSchedule(lines);
		syllabus.assessments = this.extractAssessments(lines);
		syllabus.policies = this.extractPolicies(lines);

		return syllabus;
	}

	/**
	 * Extract course title
	 */
	private extractTitle(lines: string[]): string | undefined {
		// Look for common title patterns
		for (const line of lines.slice(0, 10)) {
			if (line.match(/^(course|syllabus):/i)) {
				return line.replace(/^(course|syllabus):\s*/i, "");
			}
			// Check for uppercase title
			if (line.length > 5 && line.length < 100 && line === line.toUpperCase()) {
				return line;
			}
		}
		return lines[0] || undefined;
	}

	/**
	 * Extract course code
	 */
	private extractCourseCode(lines: string[]): string | undefined {
		const codePatterns = [
			/\b([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\b/, // CS 101, MATH201
			/course\s*(?:code|number):\s*([A-Z0-9\s-]+)/i,
		];

		for (const line of lines.slice(0, 20)) {
			for (const pattern of codePatterns) {
				const match = line.match(pattern);
				if (match) {
					return match[1].trim();
				}
			}
		}
		return undefined;
	}

	/**
	 * Extract instructor name
	 */
	private extractInstructor(lines: string[]): string | undefined {
		const instructorPatterns = [
			/(?:instructor|professor|lecturer|teacher):\s*(.+)/i,
			/(?:dr|prof)\.?\s+([A-Za-z\s]+)/i,
		];

		for (const line of lines.slice(0, 30)) {
			for (const pattern of instructorPatterns) {
				const match = line.match(pattern);
				if (match) {
					return match[1].trim();
				}
			}
		}
		return undefined;
	}

	/**
	 * Extract term/semester
	 */
	private extractTerm(lines: string[]): string | undefined {
		const termPatterns = [
			/(?:term|semester|quarter):\s*(.+)/i,
			/(spring|summer|fall|winter|autumn)\s*\d{4}/i,
			/\d{4}\s*(spring|summer|fall|winter|autumn)/i,
		];

		for (const line of lines.slice(0, 20)) {
			for (const pattern of termPatterns) {
				const match = line.match(pattern);
				if (match) {
					return match[0].trim();
				}
			}
		}
		return undefined;
	}

	/**
	 * Extract course description
	 */
	private extractDescription(lines: string[]): string | undefined {
		const descStart = lines.findIndex((l) =>
			l.match(/^(course\s*)?description:?/i),
		);
		if (descStart === -1) return undefined;

		const descLines: string[] = [];
		for (let i = descStart + 1; i < lines.length && i < descStart + 10; i++) {
			if (this.isNewSection(lines[i])) break;
			descLines.push(lines[i]);
		}

		return descLines.join(" ").trim() || undefined;
	}

	/**
	 * Extract learning objectives
	 */
	private extractObjectives(lines: string[]): string[] {
		const objectives: string[] = [];
		const objStart = lines.findIndex((l) =>
			l.match(/^(learning\s*)?(objectives?|outcomes?|goals?):?/i),
		);
		if (objStart === -1) return objectives;

		for (let i = objStart + 1; i < lines.length && i < objStart + 20; i++) {
			if (this.isNewSection(lines[i])) break;

			const line = lines[i];
			// Look for numbered or bulleted items
			const cleanLine = line.replace(/^[\d\.\)\-\*•]+\s*/, "").trim();
			if (cleanLine.length > 10) {
				objectives.push(cleanLine);
			}
		}

		return objectives;
	}

	/**
	 * Extract prerequisites
	 */
	private extractPrerequisites(lines: string[]): string[] {
		const prereqs: string[] = [];
		const preStart = lines.findIndex((l) => l.match(/^prerequisite/i));
		if (preStart === -1) return prereqs;

		for (let i = preStart + 1; i < lines.length && i < preStart + 10; i++) {
			if (this.isNewSection(lines[i])) break;
			const cleanLine = lines[i].replace(/^[\d\.\)\-\*•]+\s*/, "").trim();
			if (cleanLine.length > 3) {
				prereqs.push(cleanLine);
			}
		}

		return prereqs;
	}

	/**
	 * Extract required materials
	 */
	private extractMaterials(lines: string[]): string[] {
		const materials: string[] = [];
		const matStart = lines.findIndex((l) =>
			l.match(/^(required\s*)?(textbook|materials?|resources?|readings?):?/i),
		);
		if (matStart === -1) return materials;

		for (let i = matStart + 1; i < lines.length && i < matStart + 15; i++) {
			if (this.isNewSection(lines[i])) break;
			const cleanLine = lines[i].replace(/^[\d\.\)\-\*•]+\s*/, "").trim();
			if (cleanLine.length > 5) {
				materials.push(cleanLine);
			}
		}

		return materials;
	}

	/**
	 * Extract modules/units
	 */
	private extractModules(lines: string[]): SyllabusModule[] {
		const modules: SyllabusModule[] = [];
		const modulePatterns = [
			/^(module|unit|chapter|week|part)\s*(\d+)/i,
			/^(\d+)\.\s+(.+)/,
		];

		let currentModule: SyllabusModule | null = null;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Check for module header
			for (const pattern of modulePatterns) {
				const match = line.match(pattern);
				if (match) {
					if (currentModule) {
						modules.push(currentModule);
					}
					currentModule = {
						number: parseInt(match[1]) || modules.length + 1,
						title: match[2] || line.replace(match[0], "").trim(),
						topics: [],
					};
					break;
				}
			}

			// Add topics to current module
			if (currentModule && !line.match(modulePatterns[0])) {
				const topic = line.replace(/^[\d\.\)\-\*•]+\s*/, "").trim();
				if (topic.length > 3 && topic.length < 200) {
					currentModule.topics.push(topic);
				}
			}
		}

		if (currentModule) {
			modules.push(currentModule);
		}

		return modules;
	}

	/**
	 * Extract schedule
	 */
	private extractSchedule(lines: string[]): ScheduleItem[] {
		const schedule: ScheduleItem[] = [];
		const schedStart = lines.findIndex((l) =>
			l.match(/^(course\s*)?(schedule|calendar|timeline):?/i),
		);
		if (schedStart === -1) return schedule;

		const weekPattern = /^week\s*(\d+)/i;
		const datePattern = /(\d{1,2}\/\d{1,2}|\w+\s+\d{1,2})/;

		for (let i = schedStart + 1; i < lines.length; i++) {
			const line = lines[i];
			if (this.isNewSection(line)) break;

			const weekMatch = line.match(weekPattern);
			const dateMatch = line.match(datePattern);

			if (weekMatch || dateMatch) {
				schedule.push({
					week: weekMatch ? parseInt(weekMatch[1]) : undefined,
					date: dateMatch ? dateMatch[1] : undefined,
					topic: line
						.replace(weekPattern, "")
						.replace(datePattern, "")
						.replace(/^[\s\-:]+/, "")
						.trim(),
				});
			}
		}

		return schedule;
	}

	/**
	 * Extract assessments/grading
	 */
	private extractAssessments(lines: string[]): Assessment[] {
		const assessments: Assessment[] = [];
		const gradingStart = lines.findIndex((l) =>
			l.match(/^(grading|assessment|evaluation|grade\s*breakdown):?/i),
		);
		if (gradingStart === -1) return assessments;

		const percentPattern = /(\d+)\s*%/;
		const assessmentTypes = [
			"quiz",
			"exam",
			"midterm",
			"final",
			"assignment",
			"homework",
			"project",
			"paper",
			"participation",
			"attendance",
			"presentation",
			"lab",
		];

		for (
			let i = gradingStart + 1;
			i < lines.length && i < gradingStart + 20;
			i++
		) {
			const line = lines[i].toLowerCase();
			if (this.isNewSection(lines[i])) break;

			const percentMatch = lines[i].match(percentPattern);
			if (percentMatch) {
				const type = assessmentTypes.find((t) => line.includes(t)) || "OTHER";
				assessments.push({
					name: lines[i]
						.replace(percentPattern, "")
						.replace(/^[\d\.\)\-\*•]+\s*/, "")
						.trim(),
					type: type.toUpperCase(),
					weight: parseInt(percentMatch[1]),
				});
			}
		}

		return assessments;
	}

	/**
	 * Extract policies
	 */
	private extractPolicies(lines: string[]): Policy[] {
		const policies: Policy[] = [];
		const policyKeywords = [
			"attendance",
			"late",
			"academic integrity",
			"plagiarism",
			"disability",
			"accommodation",
			"communication",
			"office hours",
		];

		for (const keyword of policyKeywords) {
			const policyStart = lines.findIndex(
				(l) => l.toLowerCase().includes(keyword) && l.length < 50,
			);
			if (policyStart === -1) continue;

			const policyLines: string[] = [];
			for (
				let i = policyStart + 1;
				i < lines.length && i < policyStart + 10;
				i++
			) {
				if (this.isNewSection(lines[i])) break;
				policyLines.push(lines[i]);
			}

			if (policyLines.length > 0) {
				policies.push({
					name: lines[policyStart],
					content: policyLines.join(" ").trim(),
				});
			}
		}

		return policies;
	}

	/**
	 * Check if line is a new section header
	 */
	private isNewSection(line: string): boolean {
		const sectionHeaders = [
			/^(course\s*)?(description|objectives?|schedule|grading|assessment|policies|materials?|prerequisites?|outcomes?)/i,
			/^(module|unit|chapter|week|part)\s*\d+/i,
			/^[A-Z][A-Z\s]{3,}:?\s*$/,
		];

		return sectionHeaders.some((pattern) => line.match(pattern));
	}

	/**
	 * Convert parsed syllabus to course modules for import
	 */
	toCourseModules(syllabus: ParsedSyllabus): Array<{
		title: string;
		description: string;
		orderIndex: number;
		lessons: Array<{
			title: string;
			description: string;
			orderIndex: number;
		}>;
	}> {
		return syllabus.modules.map((module, index) => ({
			title: module.title,
			description: module.description || module.topics.slice(0, 2).join(". "),
			orderIndex: index,
			lessons: module.topics.map((topic, topicIndex) => ({
				title: topic,
				description: "",
				orderIndex: topicIndex,
			})),
		}));
	}
}
