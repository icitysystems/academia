import { Controller, Get } from "@nestjs/common";
import {
	HealthCheck,
	HealthCheckService,
	MemoryHealthIndicator,
	DiskHealthIndicator,
} from "@nestjs/terminus";
import { PrismaHealthIndicator } from "./prisma.health";

@Controller("health")
export class HealthController {
	constructor(
		private health: HealthCheckService,
		private memory: MemoryHealthIndicator,
		private disk: DiskHealthIndicator,
		private prismaHealth: PrismaHealthIndicator,
	) {}

	@Get()
	@HealthCheck()
	check() {
		return this.health.check([
			// Database health
			() => this.prismaHealth.isHealthy("database"),

			// Memory health (heap should be less than 512MB)
			() => this.memory.checkHeap("memory_heap", 512 * 1024 * 1024),

			// RSS memory (should be less than 1GB)
			() => this.memory.checkRSS("memory_rss", 1024 * 1024 * 1024),
		]);
	}

	@Get("ready")
	@HealthCheck()
	readiness() {
		return this.health.check([() => this.prismaHealth.isHealthy("database")]);
	}

	@Get("live")
	liveness() {
		return { status: "ok", timestamp: new Date().toISOString() };
	}
}
