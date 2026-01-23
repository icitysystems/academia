import { Module } from "@nestjs/common";
import { MLService } from "./ml.service";
import { MLResolver } from "./ml.resolver";
import { TrainingService } from "./training.service";
import { PrismaService } from "../prisma.service";
import { StorageService } from "../storage/storage.service";

@Module({
	providers: [
		MLService,
		MLResolver,
		TrainingService,
		PrismaService,
		StorageService,
	],
	exports: [MLService, TrainingService],
})
export class MLModule {}
