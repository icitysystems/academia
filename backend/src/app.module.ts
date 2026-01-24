import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "path";
import { PrismaService } from "./prisma.service";
import { AuthModule } from "./auth/auth.module";
import { TemplatesModule } from "./templates/templates.module";
import { AnnotationsModule } from "./annotations/annotations.module";
import { SheetsModule } from "./sheets/sheets.module";
import { MLModule } from "./ml/ml.module";
import { GradingModule } from "./grading/grading.module";
import { PDFModule } from "./pdf/pdf.module";
import { ReportingModule } from "./reporting/reporting.module";
import { StorageModule } from "./storage/storage.module";
import { HealthModule } from "./health/health.module";
import { QueueModule } from "./queue/queue.module";
import { UsersModule } from "./users/users.module";
import { NewsletterModule } from "./newsletter/newsletter.module";
import { PaymentsModule } from "./payments/payments.module";
import { LessonsModule } from "./lessons/lessons.module";
import { CoursesModule } from "./courses/courses.module";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { AssignmentsModule } from "./assignments/assignments.module";
import { PedagogicModule } from "./pedagogic/pedagogic.module";
import { SupportModule } from "./support/support.module";
import { DiscussionsModule } from "./discussions/discussions.module";
import { AlumniModule } from "./alumni/alumni.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { ParentModule } from "./parent/parent.module";
import configuration from "./config/configuration";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
			envFilePath: [".env.local", ".env"],
		}),
		GraphQLModule.forRootAsync<ApolloDriverConfig>({
			driver: ApolloDriver,
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				autoSchemaFile: join(process.cwd(), "src/schema.gql"),
				playground: configService.get<boolean>("graphql.playground", true),
				introspection: configService.get<boolean>(
					"graphql.introspection",
					true,
				),
				context: ({ req, res }) => ({ req, res }),
				formatError: (error) => {
					// Don't expose internal errors in production
					const isProduction =
						configService.get<string>("nodeEnv") === "production";
					if (
						isProduction &&
						error.extensions?.code === "INTERNAL_SERVER_ERROR"
					) {
						return {
							message: "Internal server error",
							extensions: { code: "INTERNAL_SERVER_ERROR" },
						};
					}
					return error;
				},
			}),
			inject: [ConfigService],
		}),
		StorageModule,
		AuthModule,
		UsersModule,
		TemplatesModule,
		AnnotationsModule,
		SheetsModule,
		MLModule,
		GradingModule,
		PDFModule,
		ReportingModule,
		HealthModule,
		QueueModule.forRoot(),
		NewsletterModule,
		PaymentsModule,
		LessonsModule,
		CoursesModule,
		QuizzesModule,
		AssignmentsModule,
		PedagogicModule,
		SupportModule,
		DiscussionsModule,
		AlumniModule,
		ComplianceModule,
		ParentModule,
	],
	providers: [PrismaService],
	exports: [PrismaService],
})
export class AppModule {}
