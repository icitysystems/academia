#!/usr/bin/env node
/**
 * Database Initialization Script for Academia
 *
 * This script creates separate databases for each environment on the shared
 * Aurora PostgreSQL instance. Run this after deploying the SharedDatabaseStack.
 *
 * Usage:
 *   node init-databases.js
 *
 * Prerequisites:
 *   - AWS CLI configured with appropriate credentials
 *   - SharedDatabaseStack deployed
 *   - Network access to Aurora cluster (VPN or bastion host)
 */

const {
	SecretsManagerClient,
	GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const { Client } = require("pg");

const ENVIRONMENTS = ["dev1", "dev2", "testing", "staging", "production"];
const SECRET_NAME = "academia/shared/db-credentials";
const REGION = process.env.AWS_REGION || "eu-west-2";

async function getDbCredentials() {
	const client = new SecretsManagerClient({ region: REGION });
	const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
	const response = await client.send(command);
	return JSON.parse(response.SecretString);
}

async function initializeDatabases() {
	console.log("🔐 Fetching database credentials from Secrets Manager...");

	let credentials;
	try {
		credentials = await getDbCredentials();
	} catch (error) {
		console.error("❌ Failed to fetch credentials:", error.message);
		console.log("\nMake sure:");
		console.log("  1. SharedDatabaseStack is deployed");
		console.log("  2. AWS credentials are configured");
		console.log("  3. You have access to Secrets Manager");
		process.exit(1);
	}

	const { host, port, username, password } = credentials;

	console.log(`📦 Connecting to Aurora cluster at ${host}:${port}...`);

	const masterClient = new Client({
		host,
		port: parseInt(port),
		user: username,
		password,
		database: "postgres",
		ssl: { rejectUnauthorized: false },
	});

	try {
		await masterClient.connect();
		console.log("✅ Connected to master database\n");

		// Create databases for each environment
		for (const env of ENVIRONMENTS) {
			const dbName = `academia_${env}`;
			console.log(`Creating database: ${dbName}...`);

			try {
				// Check if database exists
				const checkResult = await masterClient.query(
					`SELECT 1 FROM pg_database WHERE datname = $1`,
					[dbName],
				);

				if (checkResult.rows.length > 0) {
					console.log(`  ⏭️  Database ${dbName} already exists, skipping`);
				} else {
					await masterClient.query(`CREATE DATABASE ${dbName}`);
					console.log(`  ✅ Created database ${dbName}`);
				}
			} catch (error) {
				console.error(`  ❌ Failed to create ${dbName}:`, error.message);
			}
		}

		console.log("\n" + "=".repeat(60));
		console.log("Database initialization complete!");
		console.log("=".repeat(60));
		console.log("\nNext steps:");
		console.log("1. Update DATABASE_URL in each Lambda environment");
		console.log("2. Run Prisma migrations for each environment:");
		for (const env of ENVIRONMENTS) {
			console.log(
				`   DATABASE_URL="postgresql://${username}:***@${host}:${port}/academia_${env}" npx prisma migrate deploy`,
			);
		}
	} catch (error) {
		console.error("❌ Database initialization failed:", error.message);
		process.exit(1);
	} finally {
		await masterClient.end();
	}
}

// Run if executed directly
if (require.main === module) {
	initializeDatabases().catch(console.error);
}

module.exports = { initializeDatabases };
