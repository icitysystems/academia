import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import * as nodemailer from "nodemailer";

export interface EmailOptions {
	to: string | string[];
	subject: string;
	text?: string;
	html?: string;
	from?: string;
	replyTo?: string;
}

@Injectable()
export class EmailDeliveryService {
	private readonly logger = new Logger(EmailDeliveryService.name);
	private sesClient?: SESClient;
	private smtpTransport?: nodemailer.Transporter;
	private readonly provider: "ses" | "smtp" | "console";
	private readonly fromEmail: string;
	private readonly fromName: string;

	constructor(private configService: ConfigService) {
		this.fromEmail =
			this.configService.get<string>("EMAIL_FROM") || "noreply@academia.edu";
		this.fromName =
			this.configService.get<string>("EMAIL_FROM_NAME") || "Academia";

		// Determine email provider
		const sesRegion = this.configService.get<string>("AWS_SES_REGION");
		const smtpHost = this.configService.get<string>("SMTP_HOST");

		if (sesRegion) {
			this.provider = "ses";
			this.sesClient = new SESClient({
				region: sesRegion,
				credentials: {
					accessKeyId:
						this.configService.get<string>("AWS_ACCESS_KEY_ID") || "",
					secretAccessKey:
						this.configService.get<string>("AWS_SECRET_ACCESS_KEY") || "",
				},
			});
			this.logger.log(`Email initialized with AWS SES (region: ${sesRegion})`);
		} else if (smtpHost) {
			this.provider = "smtp";
			this.smtpTransport = nodemailer.createTransport({
				host: smtpHost,
				port: this.configService.get<number>("SMTP_PORT") || 587,
				secure: this.configService.get<boolean>("SMTP_SECURE") || false,
				auth: {
					user: this.configService.get<string>("SMTP_USER"),
					pass: this.configService.get<string>("SMTP_PASS"),
				},
			});
			this.logger.log(`Email initialized with SMTP (host: ${smtpHost})`);
		} else {
			this.provider = "console";
			this.logger.warn(
				"Email configured for console output only (no delivery)",
			);
		}
	}

	async sendEmail(options: EmailOptions): Promise<boolean> {
		const from = options.from || `${this.fromName} <${this.fromEmail}>`;
		const recipients = Array.isArray(options.to) ? options.to : [options.to];

		try {
			switch (this.provider) {
				case "ses":
					return this.sendViaSES(from, recipients, options);
				case "smtp":
					return this.sendViaSMTP(from, recipients, options);
				default:
					return this.logToConsole(from, recipients, options);
			}
		} catch (error) {
			this.logger.error(`Failed to send email: ${error}`);
			return false;
		}
	}

	private async sendViaSES(
		from: string,
		to: string[],
		options: EmailOptions,
	): Promise<boolean> {
		if (!this.sesClient) {
			throw new Error("SES client not initialized");
		}

		const command = new SendEmailCommand({
			Source: from,
			Destination: {
				ToAddresses: to,
			},
			ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
			Message: {
				Subject: {
					Charset: "UTF-8",
					Data: options.subject,
				},
				Body: {
					...(options.html && {
						Html: {
							Charset: "UTF-8",
							Data: options.html,
						},
					}),
					...(options.text && {
						Text: {
							Charset: "UTF-8",
							Data: options.text,
						},
					}),
				},
			},
		});

		const result = await this.sesClient.send(command);
		this.logger.log(`Email sent via SES: ${result.MessageId}`);
		return true;
	}

	private async sendViaSMTP(
		from: string,
		to: string[],
		options: EmailOptions,
	): Promise<boolean> {
		if (!this.smtpTransport) {
			throw new Error("SMTP transport not initialized");
		}

		const result = await this.smtpTransport.sendMail({
			from,
			to: to.join(", "),
			subject: options.subject,
			text: options.text,
			html: options.html,
			replyTo: options.replyTo,
		});

		this.logger.log(`Email sent via SMTP: ${result.messageId}`);
		return true;
	}

	private async logToConsole(
		from: string,
		to: string[],
		options: EmailOptions,
	): Promise<boolean> {
		this.logger.log(`[Console Email] From: ${from}`);
		this.logger.log(`[Console Email] To: ${to.join(", ")}`);
		this.logger.log(`[Console Email] Subject: ${options.subject}`);
		if (options.text) {
			this.logger.log(
				`[Console Email] Text: ${options.text.substring(0, 200)}...`,
			);
		}
		return true;
	}

	// Template-based email sending
	async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
		return this.sendEmail({
			to,
			subject: `Welcome to ${this.fromName}!`,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h1 style="color: #2563eb;">Welcome to ${this.fromName}, ${name}!</h1>
					<p>Thank you for joining our learning community.</p>
					<p>Get started by exploring our courses and resources.</p>
					<a href="${this.configService.get("FRONTEND_URL")}" 
						style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
						Explore Courses
					</a>
				</div>
			`,
			text: `Welcome to ${this.fromName}, ${name}! Thank you for joining our learning community.`,
		});
	}

	async sendPasswordResetEmail(
		to: string,
		resetToken: string,
	): Promise<boolean> {
		const resetUrl = `${this.configService.get("FRONTEND_URL")}/reset-password?token=${resetToken}`;
		return this.sendEmail({
			to,
			subject: `Reset Your ${this.fromName} Password`,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h1 style="color: #2563eb;">Password Reset</h1>
					<p>You requested a password reset. Click the button below to set a new password:</p>
					<a href="${resetUrl}" 
						style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
						Reset Password
					</a>
					<p style="margin-top: 20px; color: #666;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
				</div>
			`,
			text: `Reset your password: ${resetUrl}`,
		});
	}

	async sendEmailVerificationEmail(
		to: string,
		verificationToken: string,
	): Promise<boolean> {
		const verifyUrl = `${this.configService.get("FRONTEND_URL")}/verify-email?token=${verificationToken}`;
		return this.sendEmail({
			to,
			subject: `Verify Your ${this.fromName} Email`,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h1 style="color: #2563eb;">Verify Your Email</h1>
					<p>Please verify your email address to complete your registration:</p>
					<a href="${verifyUrl}" 
						style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
						Verify Email
					</a>
					<p style="margin-top: 20px; color: #666;">This link expires in 24 hours.</p>
				</div>
			`,
			text: `Verify your email: ${verifyUrl}`,
		});
	}

	async sendGradeNotification(
		to: string,
		studentName: string,
		assignmentTitle: string,
		score: number,
		maxScore: number,
		courseTitle: string,
	): Promise<boolean> {
		const percentage = Math.round((score / maxScore) * 100);
		return this.sendEmail({
			to,
			subject: `Grade Posted: ${assignmentTitle}`,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h1 style="color: #2563eb;">Grade Posted</h1>
					<p>Hi ${studentName},</p>
					<p>Your grade for <strong>${assignmentTitle}</strong> in <strong>${courseTitle}</strong> has been posted:</p>
					<div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<h2 style="margin: 0; color: #1f2937;">${score}/${maxScore} (${percentage}%)</h2>
					</div>
					<a href="${this.configService.get("FRONTEND_URL")}/grades" 
						style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
						View Details
					</a>
				</div>
			`,
		});
	}

	async sendAssignmentDueReminder(
		to: string,
		studentName: string,
		assignmentTitle: string,
		dueDate: Date,
		courseTitle: string,
	): Promise<boolean> {
		return this.sendEmail({
			to,
			subject: `Assignment Due Soon: ${assignmentTitle}`,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h1 style="color: #f59e0b;">⏰ Assignment Due Soon</h1>
					<p>Hi ${studentName},</p>
					<p>This is a reminder that <strong>${assignmentTitle}</strong> in <strong>${courseTitle}</strong> is due:</p>
					<div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<h2 style="margin: 0; color: #92400e;">${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString()}</h2>
					</div>
					<a href="${this.configService.get("FRONTEND_URL")}/assignments" 
						style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
						View Assignment
					</a>
				</div>
			`,
		});
	}

	getProvider(): string {
		return this.provider;
	}
}
