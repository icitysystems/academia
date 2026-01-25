import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export interface RequestLog {
	requestId: string;
	method: string;
	url: string;
	userAgent: string;
	ip: string;
	userId?: string;
	timestamp: Date;
	duration?: number;
	statusCode?: number;
	error?: string;
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
	private readonly logger = new Logger("HTTP");

	use(req: Request, res: Response, next: NextFunction) {
		const requestId = uuidv4();
		const startTime = Date.now();

		// Attach request ID to the request object
		(req as any).requestId = requestId;

		// Log request
		this.logger.log({
			requestId,
			type: "REQUEST",
			method: req.method,
			url: req.originalUrl,
			userAgent: req.get("user-agent") || "unknown",
			ip: req.ip || req.socket.remoteAddress,
			userId: (req as any).user?.sub || "anonymous",
			timestamp: new Date().toISOString(),
		});

		// Capture response
		res.on("finish", () => {
			const duration = Date.now() - startTime;

			const logData: any = {
				requestId,
				type: "RESPONSE",
				method: req.method,
				url: req.originalUrl,
				statusCode: res.statusCode,
				duration: `${duration}ms`,
				userId: (req as any).user?.sub || "anonymous",
				timestamp: new Date().toISOString(),
			};

			if (res.statusCode >= 400) {
				this.logger.warn(logData);
			} else {
				this.logger.log(logData);
			}

			// Emit metrics (if using CloudWatch or similar)
			this.emitMetrics(req.method, req.originalUrl, res.statusCode, duration);
		});

		next();
	}

	private emitMetrics(
		method: string,
		url: string,
		statusCode: number,
		duration: number,
	) {
		// This would integrate with CloudWatch, Prometheus, or other metrics systems
		// For now, we just log metrics in a structured format
		if (process.env.ENABLE_METRICS === "true") {
			console.log(
				JSON.stringify({
					metricType: "HTTP_REQUEST",
					method,
					endpoint: this.normalizeEndpoint(url),
					statusCode,
					duration,
					timestamp: Date.now(),
				}),
			);
		}
	}

	private normalizeEndpoint(url: string): string {
		// Normalize URLs by replacing IDs with placeholders
		return url
			.replace(/\/[a-f0-9-]{36}/gi, "/:id")
			.replace(/\/\d+/g, "/:id")
			.split("?")[0];
	}
}
