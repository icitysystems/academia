import { Module } from "@nestjs/common";
import { TemplatesService } from "./templates.service";
import { TemplatesResolver } from "./templates.resolver";
import { PrismaService } from "../prisma.service";
import { StorageService } from "../storage/storage.service";

@Module({
	providers: [
		TemplatesService,
		TemplatesResolver,
		PrismaService,
		StorageService,
	],
	exports: [TemplatesService],
})
export class TemplatesModule {}
