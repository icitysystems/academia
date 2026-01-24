import { Module } from "@nestjs/common";
import { MLService } from "./ml.service";
import { MLResolver } from "./ml.resolver";
import { TrainingService } from "./training.service";
import { TensorFlowInferenceService } from "./tensorflow-inference.service";
import { PrismaService } from "../prisma.service";
import { StorageService } from "../storage/storage.service";

@Module({
	providers: [
		MLService,
		MLResolver,
		TrainingService,
		TensorFlowInferenceService,
		PrismaService,
		StorageService,
	],
	exports: [MLService, TrainingService, TensorFlowInferenceService],
})
export class MLModule {}
