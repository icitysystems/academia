import { Module, Global, DynamicModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { QueueService } from "./queue.service";
import { PrismaService } from "../prisma.service";

export const QUEUE_NAMES = {
	SHEET_PROCESSING: "sheet-processing",
	TRAINING: "training",
	GRADING: "grading",
	PDF_GENERATION: "pdf-generation",
};

/**
 * Queue module that works both with Redis (production) and without (development).
 * In development mode without Redis, jobs are processed synchronously.
 */
@Global()
@Module({})
export class QueueModule {
	static forRoot(): DynamicModule {
		return {
			module: QueueModule,
			imports: [ConfigModule],
			providers: [
				{
					provide: QueueService,
					useFactory: (configService: ConfigService) => {
						const useRedis =
							configService.get<string>("REDIS_ENABLED") === "true";
						return new QueueService(useRedis);
					},
					inject: [ConfigService],
				},
				PrismaService,
			],
			exports: [QueueService],
		};
	}
}
