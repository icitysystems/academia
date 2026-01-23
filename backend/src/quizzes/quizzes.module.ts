import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { QuizzesService } from "./quizzes.service";
import { QuizzesResolver } from "./quizzes.resolver";

@Module({
	providers: [PrismaService, QuizzesService, QuizzesResolver],
	exports: [QuizzesService],
})
export class QuizzesModule {}
