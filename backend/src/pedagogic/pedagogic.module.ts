import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { PedagogicService } from "./pedagogic.service";
import { PedagogicResolver } from "./pedagogic.resolver";

@Module({
	providers: [PrismaService, PedagogicService, PedagogicResolver],
	exports: [PedagogicService],
})
export class PedagogicModule {}
