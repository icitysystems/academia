import { Module } from "@nestjs/common";
import { PDFService } from "./pdf.service";
import { PDFResolver } from "./pdf.resolver";
import { PrismaService } from "../prisma.service";
import { StorageService } from "../storage/storage.service";

@Module({
	providers: [PDFService, PDFResolver, PrismaService, StorageService],
	exports: [PDFService],
})
export class PDFModule {}
