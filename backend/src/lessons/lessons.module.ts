import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { SchoolsService } from "./services/schools.service";
import { ClassesService } from "./services/classes.service";
import { SubjectsService } from "./services/subjects.service";
import { SyllabiService } from "./services/syllabi.service";
import { LessonsService } from "./services/lessons.service";
import { AnalyticsService } from "./services/analytics.service";
import { LessonsResolver } from "./lessons.resolver";
import { StorageModule } from "../storage/storage.module";

@Module({
	imports: [StorageModule],
	providers: [
		PrismaService,
		SchoolsService,
		ClassesService,
		SubjectsService,
		SyllabiService,
		LessonsService,
		AnalyticsService,
		LessonsResolver,
	],
	exports: [
		SchoolsService,
		ClassesService,
		SubjectsService,
		SyllabiService,
		LessonsService,
		AnalyticsService,
	],
})
export class LessonsModule {}
