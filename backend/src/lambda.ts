import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ExpressAdapter } from "@nestjs/platform-express";
import serverlessExpress from "@vendia/serverless-express";
import { Handler, Context, Callback, APIGatewayProxyEvent } from "aws-lambda";
import express from "express";
import { AppModule } from "./app.module";
import {
	SecretsManagerClient,
	GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

let cachedServer: Handler;
const secretsClient = new SecretsManagerClient({});

async function getSecretValue(secretArn: string): Promise<string> {
	const command = new GetSecretValueCommand({ SecretId: secretArn });
	const response = await secretsClient.send(command);
	return response.SecretString || "";
}

async function setupEnvironment() {
	// Fetch secrets from AWS Secrets Manager and set as environment variables
	if (process.env.DB_SECRET_ARN) {
		const dbSecret = JSON.parse(
			await getSecretValue(process.env.DB_SECRET_ARN),
		);
		process.env.DATABASE_USER = dbSecret.username;
		process.env.DATABASE_PASSWORD = dbSecret.password;
		process.env.DATABASE_HOST = process.env.DB_HOST;
		process.env.DATABASE_PORT = process.env.DB_PORT;
		process.env.DATABASE_NAME = process.env.DB_NAME;

		// Construct DATABASE_URL for Prisma
		process.env.DATABASE_URL = `postgresql://${dbSecret.username}:${dbSecret.password}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?schema=public`;
	}

	if (process.env.JWT_SECRET_ARN) {
		const jwtSecret = await getSecretValue(process.env.JWT_SECRET_ARN);
		process.env.JWT_SECRET = jwtSecret;
	}

	if (process.env.STRIPE_SECRET_ARN) {
		const stripeSecrets = JSON.parse(
			await getSecretValue(process.env.STRIPE_SECRET_ARN),
		);
		process.env.STRIPE_SECRET_KEY = stripeSecrets.secretKey;
		process.env.STRIPE_WEBHOOK_SECRET = stripeSecrets.webhookSecret;
	}
}

async function bootstrapServer(): Promise<Handler> {
	// Setup environment from secrets
	await setupEnvironment();

	const expressApp = express();
	const adapter = new ExpressAdapter(expressApp);

	const app = await NestFactory.create(AppModule, adapter, {
		logger: ["error", "warn", "log"],
	});

	// Global prefix
	app.setGlobalPrefix("api");

	// CORS configuration
	const corsOrigins = process.env.CORS_ORIGINS?.split(",") || [
		"http://localhost:3000",
	];
	app.enableCors({
		origin: corsOrigins,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	});

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

	await app.init();

	return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
	context: Context,
	callback: Callback,
) => {
	if (!cachedServer) {
		cachedServer = await bootstrapServer();
	}
	return cachedServer(event, context, callback);
};
