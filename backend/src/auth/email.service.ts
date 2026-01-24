import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

export interface EmailOptions {
	to: string;
	subject: string;
	text?: string;
	html?: string;
}

@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name);
	private transporter: nodemailer.Transporter;
	private isConfigured = false;

	constructor(private configService: ConfigService) {
		this.initializeTransporter();
	}

	private initializeTransporter() {
		const smtpHost = this.configService.get<string>("email.smtpHost");
		const smtpPort = this.configService.get<number>("email.smtpPort");
		const smtpUser = this.configService.get<string>("email.smtpUser");
		const smtpPass = this.configService.get<string>("email.smtpPass");

		if (smtpHost && smtpUser && smtpPass) {
			this.transporter = nodemailer.createTransport({
				host: smtpHost,
				port: smtpPort || 587,
				secure: smtpPort === 465,
				auth: {
					user: smtpUser,
					pass: smtpPass,
				},
			});
			this.isConfigured = true;
			this.logger.log("Email service configured successfully");
		} else {
			// Use ethereal for development/testing
			this.logger.warn(
				"Email service not configured - using console logging for development",
			);
		}
	}

	async sendEmail(options: EmailOptions): Promise<boolean> {
		const fromEmail =
			this.configService.get<string>("email.fromEmail") ||
			"noreply@academia.edu";
		const fromName =
			this.configService.get<string>("email.fromName") || "Academia Platform";

		if (!this.isConfigured) {
			// Log email to console in development
			this.logger.log("========== EMAIL (DEV MODE) ==========");
			this.logger.log(`To: ${options.to}`);
			this.logger.log(`Subject: ${options.subject}`);
			this.logger.log(`Body: ${options.text || options.html}`);
			this.logger.log("=======================================");
			return true;
		}

		try {
			await this.transporter.sendMail({
				from: `"${fromName}" <${fromEmail}>`,
				to: options.to,
				subject: options.subject,
				text: options.text,
				html: options.html,
			});
			this.logger.log(`Email sent successfully to ${options.to}`);
			return true;
		} catch (error) {
			this.logger.error(`Failed to send email to ${options.to}:`, error);
			return false;
		}
	}

	async sendPasswordResetEmail(
		email: string,
		resetToken: string,
	): Promise<boolean> {
		const frontendUrl =
			this.configService.get<string>("frontend.url") || "http://localhost:3000";
		const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: #1976d2; color: white; padding: 20px; text-align: center; }
					.content { padding: 30px; background: #f9f9f9; }
					.button { display: inline-block; padding: 12px 24px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
					.footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
					.warning { color: #f57c00; font-size: 14px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>Academia Platform</h1>
					</div>
					<div class="content">
						<h2>Password Reset Request</h2>
						<p>You have requested to reset your password. Click the button below to create a new password:</p>
						<p style="text-align: center;">
							<a href="${resetLink}" class="button">Reset Password</a>
						</p>
						<p>Or copy and paste this link into your browser:</p>
						<p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">${resetLink}</p>
						<p class="warning">⚠️ This link will expire in 1 hour.</p>
						<p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
					</div>
					<div class="footer">
						<p>© 2026 Academia Platform. All rights reserved.</p>
						<p>This is an automated message. Please do not reply.</p>
					</div>
				</div>
			</body>
			</html>
		`;

		const text = `
Password Reset Request

You have requested to reset your password. Visit the following link to create a new password:

${resetLink}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

© 2026 Academia Platform
		`;

		return this.sendEmail({
			to: email,
			subject: "Reset Your Password - Academia Platform",
			html,
			text,
		});
	}

	async sendEmailVerificationEmail(
		email: string,
		verificationToken: string,
	): Promise<boolean> {
		const frontendUrl =
			this.configService.get<string>("frontend.url") || "http://localhost:3000";
		const verifyLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: #1976d2; color: white; padding: 20px; text-align: center; }
					.content { padding: 30px; background: #f9f9f9; }
					.button { display: inline-block; padding: 12px 24px; background: #4caf50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
					.footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>Academia Platform</h1>
					</div>
					<div class="content">
						<h2>Welcome to Academia!</h2>
						<p>Thank you for registering. Please verify your email address to complete your account setup:</p>
						<p style="text-align: center;">
							<a href="${verifyLink}" class="button">Verify Email Address</a>
						</p>
						<p>Or copy and paste this link into your browser:</p>
						<p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">${verifyLink}</p>
						<p>This link will expire in 24 hours.</p>
					</div>
					<div class="footer">
						<p>© 2026 Academia Platform. All rights reserved.</p>
					</div>
				</div>
			</body>
			</html>
		`;

		const text = `
Welcome to Academia!

Thank you for registering. Please verify your email address by visiting the following link:

${verifyLink}

This link will expire in 24 hours.

© 2026 Academia Platform
		`;

		return this.sendEmail({
			to: email,
			subject: "Verify Your Email - Academia Platform",
			html,
			text,
		});
	}

	async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
		const frontendUrl =
			this.configService.get<string>("frontend.url") || "http://localhost:3000";

		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: #1976d2; color: white; padding: 20px; text-align: center; }
					.content { padding: 30px; background: #f9f9f9; }
					.button { display: inline-block; padding: 12px 24px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
					.footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>Welcome to Academia!</h1>
					</div>
					<div class="content">
						<h2>Hello ${name || "there"}!</h2>
						<p>Your account has been successfully created. You can now access all the features of the Academia Platform.</p>
						<p style="text-align: center;">
							<a href="${frontendUrl}/dashboard" class="button">Go to Dashboard</a>
						</p>
						<h3>Getting Started:</h3>
						<ul>
							<li>Complete your profile information</li>
							<li>Explore available courses</li>
							<li>Connect with your instructors</li>
						</ul>
						<p>If you have any questions, don't hesitate to reach out to our support team.</p>
					</div>
					<div class="footer">
						<p>© 2026 Academia Platform. All rights reserved.</p>
					</div>
				</div>
			</body>
			</html>
		`;

		return this.sendEmail({
			to: email,
			subject: "Welcome to Academia Platform!",
			html,
		});
	}
}
