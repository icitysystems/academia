import { Module } from "@nestjs/common";
import { SheetsService } from "./sheets.service";
import { SheetsResolver } from "./sheets.resolver";
import { PrismaService } from "../prisma.service";
import { ImageProcessingService } from "./image-processing.service";
import { StorageService } from "../storage/storage.service";

@Module({
	providers: [
		SheetsService,
		SheetsResolver,
		PrismaService,
		ImageProcessingService,
		StorageService,
	],
	exports: [SheetsService, ImageProcessingService],
})
export class SheetsModule {}
