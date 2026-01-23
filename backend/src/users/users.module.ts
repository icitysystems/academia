import { Module } from "@nestjs/common";
import { UsersResolver } from "./users.resolver";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma.service";

/**
 * Users Module
 * Implements user management functionality as per Specification Sections 2A and 5.1
 * - Role-based access control for all user types
 * - Dashboard APIs for Students, Faculty, Admins, Support Staff, and Parents
 */
@Module({
	providers: [UsersResolver, UsersService, PrismaService],
	exports: [UsersService],
})
export class UsersModule {}
