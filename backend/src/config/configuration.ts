// Validate required environment variables in production
const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.JWT_SECRET) {
	throw new Error("JWT_SECRET environment variable is required in production");
}
if (isProduction && !process.env.DATABASE_URL) {
	throw new Error(
		"DATABASE_URL environment variable is required in production",
	);
}

export default () => ({
	// Server
	port: parseInt(process.env.PORT || "3333", 10),
	nodeEnv: process.env.NODE_ENV || "development",
	isProduction,

	// JWT Authentication
	jwt: {
		secret:
			process.env.JWT_SECRET ||
			(isProduction ? undefined : "dev-only-secret-change-in-production"),
		expiresIn: process.env.JWT_EXPIRES_IN || "7d",
	},

	// OAuth Providers
	google: {
		clientId: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	},

	// AWS Configuration
	aws: {
		region: process.env.AWS_REGION || "us-east-1",
		s3Bucket: process.env.AWS_S3_BUCKET || "academia-assets",
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	},

	// Storage (s3 or local)
	storage: {
		provider: process.env.STORAGE_PROVIDER || "local",
	},

	// Redis Configuration
	redis: {
		host: process.env.REDIS_HOST || "localhost",
		port: parseInt(process.env.REDIS_PORT || "6379", 10),
		password: process.env.REDIS_PASSWORD,
		url: process.env.REDIS_URL || "redis://localhost:6379",
	},

	// OCR Configuration
	ocr: {
		language: process.env.OCR_LANGUAGE || "eng",
		provider: process.env.OCR_PROVIDER || "tesseract", // tesseract, textract, vision
	},

	// ML Configuration
	ml: {
		confidenceThreshold: parseFloat(
			process.env.ML_CONFIDENCE_THRESHOLD || "0.7",
		),
		minTrainingSamples: parseInt(
			process.env.ML_MIN_TRAINING_SAMPLES || "5",
			10,
		),
		pythonServiceUrl:
			process.env.PYTHON_ML_SERVICE_URL || "http://localhost:8001",
		usePythonService: process.env.USE_PYTHON_ML_SERVICE === "true",
	},

	// Security
	security: {
		corsOrigins: process.env.CORS_ORIGINS?.split(",") || [
			"http://localhost:3000",
			"https://academia.icitysystems.org",
		],
		rateLimitWindowMs: parseInt(
			process.env.RATE_LIMIT_WINDOW_MS || "60000",
			10,
		),
		rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
	},

	// GraphQL - SECURITY: Disabled by default in production
	graphql: {
		playground:
			process.env.GRAPHQL_PLAYGROUND === "true" &&
			process.env.NODE_ENV !== "production",
		introspection:
			process.env.GRAPHQL_INTROSPECTION === "true" ||
			process.env.NODE_ENV !== "production",
	},

	// Stripe Configuration
	stripe: {
		secretKey: process.env.STRIPE_SECRET_KEY,
		publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
		webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
		successUrl:
			process.env.STRIPE_SUCCESS_URL ||
			"http://localhost:3000/subscription/success",
		cancelUrl: process.env.STRIPE_CANCEL_URL || "http://localhost:3000/pricing",
	},

	// Email Configuration (AWS SES)
	email: {
		provider: process.env.EMAIL_PROVIDER || "ses", // ses, smtp, mock
		from: process.env.EMAIL_FROM || "academia@icitysystems.org",
		fromName: process.env.EMAIL_FROM_NAME || "Academia Platform",
		replyTo: process.env.EMAIL_REPLY_TO || "academia@icitysystems.org",
		// AWS SES
		ses: {
			region:
				process.env.AWS_SES_REGION || process.env.AWS_REGION || "us-east-1",
			accessKeyId:
				process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey:
				process.env.AWS_SES_SECRET_ACCESS_KEY ||
				process.env.AWS_SECRET_ACCESS_KEY,
		},
		// SMTP Fallback
		smtp: {
			host: process.env.SMTP_HOST || "smtp.gmail.com",
			port: parseInt(process.env.SMTP_PORT || "587", 10),
			secure: process.env.SMTP_SECURE === "true",
			user: process.env.SMTP_USER,
			password: process.env.SMTP_PASSWORD,
		},
	},

	// Frontend URLs for email links
	frontend: {
		baseUrl: process.env.FRONTEND_URL || "http://localhost:3000",
		verifyEmailUrl: process.env.VERIFY_EMAIL_URL || "/verify-email",
		resetPasswordUrl: process.env.RESET_PASSWORD_URL || "/reset-password",
	},
});
