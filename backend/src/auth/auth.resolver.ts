import { Resolver, Mutation, Args, Query } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterInput } from "./dto/register.input";
import { LoginInput } from "./dto/login.input";
import { GoogleLoginInput } from "./dto/google-login.input";
import { ForgotPasswordInput } from "./dto/forgot-password.input";
import { ResetPasswordInput } from "./dto/reset-password.input";
import { VerifyEmailInput } from "./dto/verify-email.input";
import { AuthResponse } from "./dto/auth-response";
import {
	PasswordResetResponse,
	EmailVerificationResponse,
} from "./models/password-reset-response.model";
import { User } from "./models/user.model";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Resolver()
export class AuthResolver {
	constructor(private authService: AuthService) {}

	@Mutation(() => AuthResponse)
	async register(@Args("input") input: RegisterInput): Promise<AuthResponse> {
		return this.authService.register(input);
	}

	@Mutation(() => AuthResponse)
	async login(@Args("input") input: LoginInput): Promise<AuthResponse> {
		return this.authService.login(input);
	}

	@Mutation(() => AuthResponse)
	async googleLogin(
		@Args("input") input: GoogleLoginInput,
	): Promise<AuthResponse> {
		return this.authService.loginWithGoogle(input.credential);
	}

	// ==========================================
	// Password Reset Mutations
	// ==========================================

	@Mutation(() => PasswordResetResponse)
	async forgotPassword(
		@Args("input") input: ForgotPasswordInput,
	): Promise<PasswordResetResponse> {
		return this.authService.forgotPassword(input.email);
	}

	@Mutation(() => PasswordResetResponse)
	async resetPassword(
		@Args("input") input: ResetPasswordInput,
	): Promise<PasswordResetResponse> {
		return this.authService.resetPassword(input.token, input.newPassword);
	}

	@Query(() => PasswordResetResponse)
	async validateResetToken(
		@Args("token") token: string,
	): Promise<PasswordResetResponse> {
		const result = await this.authService.validateResetToken(token);
		return {
			success: result.valid,
			message: result.valid
				? `Token is valid for ${result.email}`
				: "Invalid or expired token",
		};
	}

	// ==========================================
	// Email Verification Mutations
	// ==========================================

	@Mutation(() => EmailVerificationResponse)
	async verifyEmail(
		@Args("input") input: VerifyEmailInput,
	): Promise<EmailVerificationResponse> {
		return this.authService.verifyEmail(input.token);
	}

	@Mutation(() => PasswordResetResponse)
	@UseGuards(GqlAuthGuard)
	async resendVerificationEmail(
		@CurrentUser() user: any,
	): Promise<PasswordResetResponse> {
		return this.authService.resendVerificationEmail(user.sub);
	}

	// ==========================================
	// User Queries
	// ==========================================

	@Query(() => User)
	@UseGuards(GqlAuthGuard)
	async me(@CurrentUser() user: any): Promise<User> {
		return this.authService.validateUser(user.sub);
	}
}
