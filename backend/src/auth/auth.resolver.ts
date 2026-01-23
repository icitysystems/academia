import { Resolver, Mutation, Args, Query } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterInput } from "./dto/register.input";
import { LoginInput } from "./dto/login.input";
import { GoogleLoginInput } from "./dto/google-login.input";
import { AuthResponse } from "./dto/auth-response";
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

	@Query(() => User)
	@UseGuards(GqlAuthGuard)
	async me(@CurrentUser() user: any): Promise<User> {
		return this.authService.validateUser(user.sub);
	}
}
