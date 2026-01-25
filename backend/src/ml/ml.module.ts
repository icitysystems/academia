import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { MLService } from "./ml.service";
import { MLResolver } from "./ml.resolver";
import { TrainingService } from "./training.service";
import { TensorFlowInferenceService } from "./tensorflow-inference.service";
import { PythonMLClientService } from "./python-ml-client.service";
import { PrismaService } from "../prisma.service";
import { StorageService } from "../storage/storage.service";

@Module({
	imports: [
		HttpModule.register({
			timeout: 30000,
			maxRedirects: 5,
		}),
		ConfigModule,
	],
	providers: [
		MLService,
		MLResolver,
		TrainingService,
		TensorFlowInferenceService,
		PythonMLClientService,
		PrismaService,
		StorageService,
	],
	exports: [
		MLService,
		TrainingService,
		TensorFlowInferenceService,
		PythonMLClientService,
	],
})
export class MLModule {}
