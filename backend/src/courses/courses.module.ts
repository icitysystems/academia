import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CoursesService } from "./courses.service";
import { CoursesResolver } from "./courses.resolver";

@Module({
	providers: [PrismaService, CoursesService, CoursesResolver],
	exports: [CoursesService],
})
export class CoursesModule {}
