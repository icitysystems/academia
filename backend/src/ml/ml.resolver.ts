import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { MLService } from "./ml.service";
import { TrainingService } from "./training.service";
import { MLModel } from "./models/ml-model.model";
import { TrainingSession } from "./models/training-session.model";
import { TrainingStats } from "./models/training-stats.model";
import { StartTrainingInput } from "./dto/start-training.input";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma.service";

@Resolver()
@UseGuards(GqlAuthGuard)
export class MLResolver {
	constructor(
		private mlService: MLService,
		private trainingService: TrainingService,
		private prisma: PrismaService,
	) {}

	@Mutation(() => TrainingSession)
	async startTraining(
		@Args("input") input: StartTrainingInput,
		@CurrentUser() user: any,
	): Promise<TrainingSession> {
		// Create training session
		const session = await this.prisma.trainingSession.create({
			data: {
				teacherId: user.sub,
				status: "PENDING",
				config: input.config as any,
			},
		});

		// Build config with defaults
		const config = {
			epochs: input.config?.epochs ?? 10,
			learningRate: input.config?.learningRate ?? 0.001,
			batchSize: input.config?.batchSize ?? 32,
			validationSplit: input.config?.validationSplit ?? 0.2,
		};

		// Start training asynchronously
		this.trainingService
			.trainModel(session.id, input.templateId, user.sub, config)
			.catch((err) => {
				console.error("Training failed:", err);
			});

		return session;
	}

	@Query(() => [TrainingSession])
	async trainingSessions(
		@CurrentUser() user: any,
		@Args("templateId", { type: () => ID, nullable: true }) templateId?: string,
	) {
		return this.prisma.trainingSession.findMany({
			where: {
				teacherId: user.sub,
				...(templateId && {
					models: { some: { templateId } },
				}),
			},
			include: {
				models: true,
			},
			orderBy: { createdAt: "desc" },
		});
	}

	@Query(() => TrainingSession, { nullable: true })
	async trainingSession(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.prisma.trainingSession.findFirst({
			where: {
				id,
				teacherId: user.sub,
			},
			include: {
				models: true,
			},
		});
	}

	@Query(() => [MLModel])
	async models(@Args("templateId", { type: () => ID }) templateId: string) {
		return this.mlService.getModels(templateId);
	}

	@Query(() => MLModel, { nullable: true })
	async activeModel(
		@Args("templateId", { type: () => ID }) templateId: string,
	) {
		return this.mlService.getActiveModel(templateId);
	}

	@Mutation(() => MLModel)
	async setActiveModel(
		@Args("modelId", { type: () => ID }) modelId: string,
		@Args("templateId", { type: () => ID }) templateId: string,
	) {
		return this.mlService.setActiveModel(modelId, templateId);
	}

	@Query(() => TrainingStats)
	async trainingStats(
		@Args("templateId", { type: () => ID }) templateId: string,
		@CurrentUser() user: any,
	) {
		return this.trainingService.getTrainingStats(templateId, user.sub);
	}
}
