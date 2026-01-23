import { Module } from "@nestjs/common";
import { GradingService } from "./grading.service";
import { GradingResolver } from "./grading.resolver";
import { GradingWorkflowService } from "./services/grading-workflow.service";
import { GradingWorkflowResolver } from "./resolvers/grading-workflow.resolver";
import { PrismaService } from "../prisma.service";
import { MLService } from "../ml/ml.service";

@Module({
	providers: [
		GradingService,
		GradingResolver,
		GradingWorkflowService,
		GradingWorkflowResolver,
		PrismaService,
		MLService,
	],
	exports: [GradingService, GradingWorkflowService],
})
export class GradingModule {}
