import { Module } from "@nestjs/common";
import { AnnotationsService } from "./annotations.service";
import { AnnotationsResolver } from "./annotations.resolver";
import { PrismaService } from "../prisma.service";

@Module({
	providers: [AnnotationsService, AnnotationsResolver, PrismaService],
	exports: [AnnotationsService],
})
export class AnnotationsModule {}
