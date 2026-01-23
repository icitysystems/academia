import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AssignmentsService } from "./assignments.service";
import { AssignmentsResolver } from "./assignments.resolver";

@Module({
	providers: [PrismaService, AssignmentsService, AssignmentsResolver],
	exports: [AssignmentsService],
})
export class AssignmentsModule {}
