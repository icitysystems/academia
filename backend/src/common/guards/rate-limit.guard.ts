import {
	Injectable,
	CanActivate,
	ExecutionContext,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { ConfigService } from "@nestjs/config";

export const RATE_LIMIT_KEY = "rateLimit";

export interface RateLimitConfig {
	limit: number; // Max requests
	window: number; // Time window in seconds
	message?: string;
}

export function RateLimit(config: RateLimitConfig) {
	return (
		target: any,
		propertyKey?: string,
		descriptor?: PropertyDescriptor,
	) => {
		if (propertyKey && descriptor) {
			// Method decorator
			Reflect.defineMetadata(RATE_LIMIT_KEY, config, target, propertyKey);
		} else {
			// Class decorator
			Reflect.defineMetadata(RATE_LIMIT_KEY, config, target);
		}
		return descriptor || target;
	};
}

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

@Injectable()
export class GraphQLRateLimitGuard implements CanActivate {
	private readonly store = new Map<string, RateLimitEntry>();
	private readonly cleanupInterval: NodeJS.Timeout;

	// Default limits for different operation types
	private readonly defaultLimits: Record<string, RateLimitConfig> = {
		// Public queries (no auth required)
		"Query:featuredCourses": { limit: 100, window: 60 },
		"Query:publicCourses": { limit: 50, window: 60 },
		"Query:courseCategories": { limit: 100, window: 60 },
		"Query:testimonials": { limit: 100, window: 60 },
		"Query:platformStats": { limit: 100, window: 60 },
		"Query:homepageData": { limit: 50, window: 60 },

		// Authentication
		"Mutation:login": { limit: 5, window: 60 },
		"Mutation:register": { limit: 3, window: 60 },
		"Mutation:requestPasswordReset": { limit: 3, window: 300 },
		"Mutation:verifyMfa": { limit: 5, window: 60 },

		// Heavy operations
		"Query:searchCourses": { limit: 30, window: 60 },
		"Query:reports": { limit: 10, window: 60 },
		"Query:analytics": { limit: 20, window: 60 },
		"Mutation:uploadFile": { limit: 20, window: 60 },
		"Mutation:gradeSubmission": { limit: 50, window: 60 },

		// Default for authenticated users
		"default_authenticated": { limit: 200, window: 60 },

		// Default for unauthenticated users
		"default_public": { limit: 60, window: 60 },
	};

	constructor(
		private reflector: Reflector,
		private configService: ConfigService,
	) {
		// Clean up expired entries every minute
		this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const ctx = GqlExecutionContext.create(context);
		const info = ctx.getInfo();
		const request = ctx.getContext().req;

		if (!info || !request) {
			return true; // Can't rate limit without info
		}

		const operationType = info.parentType.name; // Query or Mutation
		const fieldName = info.fieldName;
		const operationKey = `${operationType}:${fieldName}`;

		// Get rate limit config
		const config = this.getRateLimitConfig(context, operationKey, request);
		if (!config) {
			return true; // No rate limiting configured
		}

		// Get client identifier (IP + optional user ID)
		const clientId = this.getClientId(request, operationKey);

		// Check rate limit
		const now = Date.now();
		const entry = this.store.get(clientId);

		if (!entry || entry.resetAt < now) {
			// New window
			this.store.set(clientId, {
				count: 1,
				resetAt: now + config.window * 1000,
			});
			return true;
		}

		if (entry.count >= config.limit) {
			const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

			throw new HttpException(
				{
					statusCode: HttpStatus.TOO_MANY_REQUESTS,
					message:
						config.message ||
						`Rate limit exceeded. Try again in ${retryAfter} seconds.`,
					retryAfter,
				},
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}

		entry.count++;
		return true;
	}

	private getRateLimitConfig(
		context: ExecutionContext,
		operationKey: string,
		request: any,
	): RateLimitConfig | null {
		// Check for decorator-based config
		const handler = context.getHandler();
		const classRef = context.getClass();

		const methodConfig = this.reflector.get<RateLimitConfig>(
			RATE_LIMIT_KEY,
			handler,
		);
		if (methodConfig) return methodConfig;

		const classConfig = this.reflector.get<RateLimitConfig>(
			RATE_LIMIT_KEY,
			classRef,
		);
		if (classConfig) return classConfig;

		// Check default limits
		if (this.defaultLimits[operationKey]) {
			return this.defaultLimits[operationKey];
		}

		// Check if user is authenticated
		const isAuthenticated = !!request?.user;

		return isAuthenticated
			? this.defaultLimits.default_authenticated
			: this.defaultLimits.default_public;
	}

	private getClientId(request: any, operationKey: string): string {
		const ip = this.getClientIP(request);
		const userId = request?.user?.id || "anonymous";

		return `${ip}:${userId}:${operationKey}`;
	}

	private getClientIP(request: any): string {
		return (
			request?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
			request?.headers?.["x-real-ip"] ||
			request?.connection?.remoteAddress ||
			request?.ip ||
			"unknown"
		);
	}

	private cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.store.entries()) {
			if (entry.resetAt < now) {
				this.store.delete(key);
			}
		}
	}

	onModuleDestroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}
}

// IP-based rate limiter for very strict limits
@Injectable()
export class IPRateLimitGuard implements CanActivate {
	private readonly store = new Map<string, RateLimitEntry>();
	private readonly globalLimit: number;
	private readonly globalWindow: number;

	constructor(private configService: ConfigService) {
		this.globalLimit = this.configService.get<number>(
			"RATE_LIMIT_GLOBAL",
			1000,
		);
		this.globalWindow = this.configService.get<number>("RATE_LIMIT_WINDOW", 60);
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const ctx = GqlExecutionContext.create(context);
		const request = ctx.getContext().req;

		const ip = this.getClientIP(request);
		const now = Date.now();

		const entry = this.store.get(ip);

		if (!entry || entry.resetAt < now) {
			this.store.set(ip, {
				count: 1,
				resetAt: now + this.globalWindow * 1000,
			});
			return true;
		}

		if (entry.count >= this.globalLimit) {
			throw new HttpException(
				{
					statusCode: HttpStatus.TOO_MANY_REQUESTS,
					message: "Too many requests from this IP address.",
				},
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}

		entry.count++;
		return true;
	}

	private getClientIP(request: any): string {
		return (
			request?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
			request?.headers?.["x-real-ip"] ||
			request?.connection?.remoteAddress ||
			request?.ip ||
			"unknown"
		);
	}
}
