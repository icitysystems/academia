import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
	const logger = new Logger("Bootstrap");
	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	const configService = app.get(ConfigService);
	const port = configService.get<number>("port", 3333);
	const nodeEnv = configService.get<string>("nodeEnv", "development");
	const corsOrigins = configService.get<string[]>("security.corsOrigins", [
		"http://localhost:3000",
	]);

	// Global prefix
	app.setGlobalPrefix("api");

	// Security middleware
	if (nodeEnv === "production") {
		app.use(
			helmet({
				contentSecurityPolicy: {
					directives: {
						defaultSrc: ["'self'"],
						styleSrc: ["'self'", "'unsafe-inline'"],
						imgSrc: ["'self'", "data:", "https:"],
						scriptSrc: ["'self'"],
					},
				},
			}),
		);
	}

	// CORS configuration
	app.enableCors({
		origin: corsOrigins,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	});

	// Rate limiting
	const rateLimitWindowMs = configService.get<number>(
		"security.rateLimitWindowMs",
		60000,
	);
	const rateLimitMax = configService.get<number>("security.rateLimitMax", 100);

	app.use(
		rateLimit({
			windowMs: rateLimitWindowMs,
			max: rateLimitMax,
			message: { error: "Too many requests, please try again later" },
			standardHeaders: true,
			legacyHeaders: false,
		}),
	);

	// Global validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
		}),
	);

	// Serve static files (uploads) in development
	if (nodeEnv !== "production") {
		app.useStaticAssets(join(process.cwd(), "uploads"), {
			prefix: "/uploads",
		});
	}

	// Validate required config in production
	if (nodeEnv === "production") {
		const jwtSecret = configService.get<string>("jwt.secret");
		if (!jwtSecret) {
			throw new Error(
				"JWT_SECRET environment variable is required in production",
			);
		}
	}

	await app.listen(port);
	logger.log(`🚀 Application running on port ${port} in ${nodeEnv} mode`);
	logger.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();
