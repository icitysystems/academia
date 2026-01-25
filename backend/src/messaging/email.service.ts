import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
	SESClient,
	SendEmailCommand,
	SendEmailCommandInput,
} from "@aws-sdk/client-ses";
import * as nodemailer from "nodemailer";

export interface EmailOptions {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
	replyTo?: string;
	attachments?: Array<{
		filename: string;
		content: Buffer | string;
		contentType?: string;
	}>;
}

export interface EmailTemplate {
	subject: string;
	html: string;
	text?: string;
}

@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name);
	private sesClient: SESClient | null = null;
	private smtpTransporter: nodemailer.Transporter | null = null;
	private readonly provider: string;
	private readonly fromEmail: string;
	private readonly fromName: string;
	private readonly frontendUrl: string;

	constructor(private configService: ConfigService) {
		this.provider = this.configService.get<string>("email.provider", "mock");
		this.fromEmail = this.configService.get<string>(
			"email.from",
			"noreply@academia.icitysystems.org",
		);
		this.fromName = this.configService.get<string>(
			"email.fromName",
			"Academia Platform",
		);
		this.frontendUrl = this.configService.get<string>(
			"frontend.baseUrl",
			"http://localhost:3000",
		);

		this.initializeProvider();
	}

	private initializeProvider() {
		if (this.provider === "ses") {
			const region = this.configService.get<string>("email.ses.region");
			const accessKeyId = this.configService.get<string>(
				"email.ses.accessKeyId",
			);
			const secretAccessKey = this.configService.get<string>(
				"email.ses.secretAccessKey",
			);

			if (accessKeyId && secretAccessKey) {
				this.sesClient = new SESClient({
					region,
					credentials: { accessKeyId, secretAccessKey },
				});
				this.logger.log("AWS SES email provider initialized");
			} else {
				this.logger.warn(
					"AWS SES credentials not configured, falling back to mock",
				);
			}
		} else if (this.provider === "smtp") {
			const host = this.configService.get<string>("email.smtp.host");
			const port = this.configService.get<number>("email.smtp.port");
			const user = this.configService.get<string>("email.smtp.user");
			const password = this.configService.get<string>("email.smtp.password");

			if (host && user && password) {
				this.smtpTransporter = nodemailer.createTransport({
					host,
					port,
					secure: port === 465,
					auth: { user, pass: password },
				});
				this.logger.log("SMTP email provider initialized");
			} else {
				this.logger.warn(
					"SMTP credentials not configured, falling back to mock",
				);
			}
		} else {
			this.logger.log("Using mock email provider (emails will be logged only)");
		}
	}

	async sendEmail(options: EmailOptions): Promise<boolean> {
		const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
		const from = `${this.fromName} <${this.fromEmail}>`;

		try {
			if (this.sesClient) {
				return this.sendViaSES(toAddresses, from, options);
			} else if (this.smtpTransporter) {
				return this.sendViaSMTP(toAddresses, from, options);
			} else {
				return this.mockSend(toAddresses, from, options);
			}
		} catch (error) {
			this.logger.error(`Failed to send email: ${error.message}`, error.stack);
			return false;
		}
	}

	private async sendViaSES(
		toAddresses: string[],
		from: string,
		options: EmailOptions,
	): Promise<boolean> {
		const params: SendEmailCommandInput = {
			Source: from,
			Destination: { ToAddresses: toAddresses },
			Message: {
				Subject: { Data: options.subject, Charset: "UTF-8" },
				Body: {
					Html: { Data: options.html, Charset: "UTF-8" },
					...(options.text && {
						Text: { Data: options.text, Charset: "UTF-8" },
					}),
				},
			},
			...(options.replyTo && { ReplyToAddresses: [options.replyTo] }),
		};

		const command = new SendEmailCommand(params);
		const response = await this.sesClient!.send(command);
		this.logger.log(`Email sent via SES: ${response.MessageId}`);
		return true;
	}

	private async sendViaSMTP(
		toAddresses: string[],
		from: string,
		options: EmailOptions,
	): Promise<boolean> {
		const info = await this.smtpTransporter!.sendMail({
			from,
			to: toAddresses.join(", "),
			subject: options.subject,
			html: options.html,
			text: options.text,
			replyTo: options.replyTo,
			attachments: options.attachments,
		});
		this.logger.log(`Email sent via SMTP: ${info.messageId}`);
		return true;
	}

	private mockSend(
		toAddresses: string[],
		from: string,
		options: EmailOptions,
	): boolean {
		this.logger.log("=== MOCK EMAIL ===");
		this.logger.log(`From: ${from}`);
		this.logger.log(`To: ${toAddresses.join(", ")}`);
		this.logger.log(`Subject: ${options.subject}`);
		this.logger.log(
			`Body: ${options.text || options.html.substring(0, 200)}...`,
		);
		this.logger.log("==================");
		return true;
	}

	// ========== Email Templates ==========

	async sendVerificationEmail(
		email: string,
		token: string,
		name?: string,
	): Promise<boolean> {
		const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
		const template = this.getVerificationEmailTemplate(
			name || email,
			verifyUrl,
		);
		return this.sendEmail({ to: email, ...template });
	}

	async sendPasswordResetEmail(
		email: string,
		token: string,
		name?: string,
	): Promise<boolean> {
		const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
		const template = this.getPasswordResetTemplate(name || email, resetUrl);
		return this.sendEmail({ to: email, ...template });
	}

	async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
		const template = this.getWelcomeEmailTemplate(name);
		return this.sendEmail({ to: email, ...template });
	}

	async sendEnrollmentConfirmation(
		email: string,
		name: string,
		courseName: string,
		courseId: string,
	): Promise<boolean> {
		const courseUrl = `${this.frontendUrl}/university/courses/${courseId}`;
		const template = this.getEnrollmentConfirmationTemplate(
			name,
			courseName,
			courseUrl,
		);
		return this.sendEmail({ to: email, ...template });
	}

	async sendGradeNotification(
		email: string,
		name: string,
		courseName: string,
		assignmentName: string,
		grade: string,
	): Promise<boolean> {
		const template = this.getGradeNotificationTemplate(
			name,
			courseName,
			assignmentName,
			grade,
		);
		return this.sendEmail({ to: email, ...template });
	}

	async sendAssignmentReminder(
		email: string,
		name: string,
		assignmentName: string,
		dueDate: Date,
		courseId: string,
		assignmentId: string,
	): Promise<boolean> {
		const assignmentUrl = `${this.frontendUrl}/university/courses/${courseId}/assignments/${assignmentId}`;
		const template = this.getAssignmentReminderTemplate(
			name,
			assignmentName,
			dueDate,
			assignmentUrl,
		);
		return this.sendEmail({ to: email, ...template });
	}

	async sendCertificateEmail(
		email: string,
		name: string,
		courseName: string,
		certificateUrl: string,
	): Promise<boolean> {
		const template = this.getCertificateEmailTemplate(
			name,
			courseName,
			certificateUrl,
		);
		return this.sendEmail({ to: email, ...template });
	}

	// ========== Template Generators ==========

	private getVerificationEmailTemplate(
		name: string,
		verifyUrl: string,
	): EmailTemplate {
		return {
			subject: "Verify Your Academia Account",
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<style>
						body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
						.container { max-width: 600px; margin: 0 auto; padding: 20px; }
						.header { background: linear-gradient(135deg, #1976d2, #42a5f5); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
						.content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
						.button { display: inline-block; background: #1976d2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
						.button:hover { background: #1565c0; }
						.footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
					</style>
				</head>
				<body>
					<div class="container">
						<div class="header">
							<h1>🎓 Academia</h1>
							<p>Welcome to Your Learning Journey!</p>
						</div>
						<div class="content">
							<h2>Hello ${name}!</h2>
							<p>Thank you for joining Academia. Please verify your email address to get started.</p>
							<p style="text-align: center;">
								<a href="${verifyUrl}" class="button">Verify Email Address</a>
							</p>
							<p>Or copy and paste this link into your browser:</p>
							<p style="word-break: break-all; color: #1976d2;">${verifyUrl}</p>
							<p>This link will expire in 24 hours.</p>
						</div>
						<div class="footer">
							<p>If you didn't create an account, you can safely ignore this email.</p>
							<p>© ${new Date().getFullYear()} Academia. All rights reserved.</p>
						</div>
					</div>
				</body>
				</html>
			`,
			text: `Hello ${name}!\n\nPlease verify your email by clicking this link: ${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, please ignore this email.`,
		};
	}

	private getPasswordResetTemplate(
		name: string,
		resetUrl: string,
	): EmailTemplate {
		return {
			subject: "Reset Your Academia Password",
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<style>
						body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
						.container { max-width: 600px; margin: 0 auto; padding: 20px; }
						.header { background: linear-gradient(135deg, #f44336, #e57373); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
						.content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
						.button { display: inline-block; background: #f44336; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
						.footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
					</style>
				</head>
				<body>
					<div class="container">
						<div class="header">
							<h1>🔐 Password Reset</h1>
						</div>
						<div class="content">
							<h2>Hello ${name}!</h2>
							<p>We received a request to reset your password. Click the button below to create a new password:</p>
							<p style="text-align: center;">
								<a href="${resetUrl}" class="button">Reset Password</a>
							</p>
							<p>Or copy and paste this link into your browser:</p>
							<p style="word-break: break-all; color: #f44336;">${resetUrl}</p>
							<p><strong>This link will expire in 1 hour.</strong></p>
							<p>If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.</p>
						</div>
						<div class="footer">
							<p>© ${new Date().getFullYear()} Academia. All rights reserved.</p>
						</div>
					</div>
				</body>
				</html>
			`,
			text: `Hello ${name}!\n\nWe received a request to reset your password. Click this link to create a new password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
		};
	}

	private getWelcomeEmailTemplate(name: string): EmailTemplate {
		const dashboardUrl = `${this.frontendUrl}/university/dashboard`;
		return {
			subject: "Welcome to Academia! 🎓",
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<style>
						body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
						.container { max-width: 600px; margin: 0 auto; padding: 20px; }
						.header { background: linear-gradient(135deg, #4caf50, #81c784); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
						.content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
						.button { display: inline-block; background: #4caf50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
						.feature { display: flex; align-items: center; margin: 15px 0; }
						.feature-icon { font-size: 24px; margin-right: 15px; }
						.footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
					</style>
				</head>
				<body>
					<div class="container">
						<div class="header">
							<h1>🎉 Welcome to Academia!</h1>
							<p>Your Learning Journey Begins Now</p>
						</div>
						<div class="content">
							<h2>Hello ${name}!</h2>
							<p>We're thrilled to have you join our learning community. Here's what you can do:</p>
							<div class="feature"><span class="feature-icon">📚</span><span>Browse 100+ courses across various subjects</span></div>
							<div class="feature"><span class="feature-icon">🎯</span><span>Track your progress with detailed analytics</span></div>
							<div class="feature"><span class="feature-icon">📝</span><span>Take quizzes and submit assignments</span></div>
							<div class="feature"><span class="feature-icon">🏆</span><span>Earn certificates upon completion</span></div>
							<div class="feature"><span class="feature-icon">💬</span><span>Join course discussions with peers</span></div>
							<p style="text-align: center;">
								<a href="${dashboardUrl}" class="button">Go to Dashboard</a>
							</p>
						</div>
						<div class="footer">
							<p>Need help? Contact us at support@academia.icitysystems.org</p>
							<p>© ${new Date().getFullYear()} Academia. All rights reserved.</p>
						</div>
					</div>
				</body>
				</html>
			`,
			text: `Hello ${name}!\n\nWelcome to Academia! Your learning journey begins now.\n\nVisit your dashboard: ${dashboardUrl}\n\nNeed help? Contact support@academia.icitysystems.org`,
		};
	}

	private getEnrollmentConfirmationTemplate(
		name: string,
		courseName: string,
		courseUrl: string,
	): EmailTemplate {
		return {
			subject: `You're enrolled in ${courseName}!`,
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<style>
						body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
						.container { max-width: 600px; margin: 0 auto; padding: 20px; }
						.header { background: linear-gradient(135deg, #9c27b0, #ba68c8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
						.content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
						.button { display: inline-block; background: #9c27b0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
						.course-card { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
						.footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
					</style>
				</head>
				<body>
					<div class="container">
						<div class="header">
							<h1>🎓 Enrollment Confirmed!</h1>
						</div>
						<div class="content">
							<h2>Hello ${name}!</h2>
							<p>Great news! You've successfully enrolled in:</p>
							<div class="course-card">
								<h3 style="margin: 0; color: #9c27b0;">${courseName}</h3>
							</div>
							<p>You can start learning right away. Access all course materials, quizzes, and discussions.</p>
							<p style="text-align: center;">
								<a href="${courseUrl}" class="button">Start Learning</a>
							</p>
						</div>
						<div class="footer">
							<p>© ${new Date().getFullYear()} Academia. All rights reserved.</p>
						</div>
					</div>
				</body>
				</html>
			`,
			text: `Hello ${name}!\n\nYou've successfully enrolled in ${courseName}!\n\nStart learning now: ${courseUrl}`,
		};
	}

	private getGradeNotificationTemplate(
		name: string,
		courseName: string,
		assignmentName: string,
		grade: string,
	): EmailTemplate {
		return {
			subject: `Your grade for ${assignmentName} is ready`,
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<style>
						body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
						.container { max-width: 600px; margin: 0 auto; padding: 20px; }
						.header { background: linear-gradient(135deg, #ff9800, #ffb74d); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
						.content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
						.grade-card { background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #ff9800; }
						.grade { font-size: 48px; font-weight: bold; color: #ff9800; }
						.footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
					</style>
				</head>
				<body>
					<div class="container">
						<div class="header">
							<h1>📊 Grade Posted</h1>
						</div>
						<div class="content">
							<h2>Hello ${name}!</h2>
							<p>Your grade for <strong>${assignmentName}</strong> in <strong>${courseName}</strong> has been posted:</p>
							<div class="grade-card">
								<div class="grade">${grade}</div>
							</div>
							<p>Log in to your dashboard to view detailed feedback from your instructor.</p>
						</div>
						<div class="footer">
							<p>© ${new Date().getFullYear()} Academia. All rights reserved.</p>
						</div>
					</div>
				</body>
				</html>
			`,
			text: `Hello ${name}!\n\nYour grade for ${assignmentName} in ${courseName}: ${grade}\n\nLog in to view detailed feedback.`,
		};
	}

	private getAssignmentReminderTemplate(
		name: string,
		assignmentName: string,
		dueDate: Date,
		assignmentUrl: string,
	): EmailTemplate {
		const formattedDate = dueDate.toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});

		return {
			subject: `⏰ Reminder: ${assignmentName} due soon`,
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<style>
						body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
						.container { max-width: 600px; margin: 0 auto; padding: 20px; }
						.header { background: linear-gradient(135deg, #f44336, #e57373); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
						.content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
						.button { display: inline-block; background: #f44336; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
						.due-date { background: #ffebee; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border-left: 4px solid #f44336; }
						.footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
					</style>
				</head>
				<body>
					<div class="container">
						<div class="header">
							<h1>⏰ Assignment Reminder</h1>
						</div>
						<div class="content">
							<h2>Hello ${name}!</h2>
							<p>This is a friendly reminder that <strong>${assignmentName}</strong> is due soon.</p>
							<div class="due-date">
								<strong>Due: ${formattedDate}</strong>
							</div>
							<p style="text-align: center;">
								<a href="${assignmentUrl}" class="button">Submit Assignment</a>
							</p>
						</div>
						<div class="footer">
							<p>© ${new Date().getFullYear()} Academia. All rights reserved.</p>
						</div>
					</div>
				</body>
				</html>
			`,
			text: `Hello ${name}!\n\nReminder: ${assignmentName} is due on ${formattedDate}.\n\nSubmit here: ${assignmentUrl}`,
		};
	}

	private getCertificateEmailTemplate(
		name: string,
		courseName: string,
		certificateUrl: string,
	): EmailTemplate {
		return {
			subject: `🎉 Congratulations! Your Certificate for ${courseName}`,
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<style>
						body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
						.container { max-width: 600px; margin: 0 auto; padding: 20px; }
						.header { background: linear-gradient(135deg, #ffd700, #ffed4a); color: #333; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
						.content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
						.button { display: inline-block; background: #ffd700; color: #333; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
						.certificate-preview { background: linear-gradient(135deg, #f5f5f5, #eeeeee); padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #ffd700; }
						.footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
					</style>
				</head>
				<body>
					<div class="container">
						<div class="header">
							<h1>🏆 Congratulations!</h1>
							<p>You've earned a certificate!</p>
						</div>
						<div class="content">
							<h2>Hello ${name}!</h2>
							<p>You've successfully completed <strong>${courseName}</strong>!</p>
							<div class="certificate-preview">
								<span style="font-size: 60px;">🎓</span>
								<h3>Certificate of Completion</h3>
								<p><em>${courseName}</em></p>
							</div>
							<p style="text-align: center;">
								<a href="${certificateUrl}" class="button">View & Download Certificate</a>
							</p>
							<p>Share your achievement on LinkedIn and celebrate your learning journey!</p>
						</div>
						<div class="footer">
							<p>© ${new Date().getFullYear()} Academia. All rights reserved.</p>
						</div>
					</div>
				</body>
				</html>
			`,
			text: `Congratulations ${name}!\n\nYou've completed ${courseName} and earned a certificate!\n\nView it here: ${certificateUrl}`,
		};
	}
}
