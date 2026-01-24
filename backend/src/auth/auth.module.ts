import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthResolver } from "./auth.resolver";
import { JwtStrategy } from "./jwt.strategy";
import { EmailService } from "./email.service";
import { PrismaService } from "../prisma.service";

@Module({
	imports: [
		PassportModule.register({ defaultStrategy: "jwt" }),
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				secret: configService.get<string>("jwt.secret"),
				signOptions: {
					expiresIn: configService.get<string>("jwt.expiresIn"),
				},
			}),
			inject: [ConfigService],
		}),
	],
	providers: [
		AuthService,
		AuthResolver,
		JwtStrategy,
		EmailService,
		PrismaService,
	],
	exports: [AuthService, EmailService, JwtModule],
})
export class AuthModule {}
