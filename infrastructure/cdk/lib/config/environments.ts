// =============================================================================
// Environment Configurations for Academia Platform
// =============================================================================

export type EnvironmentName =
	| "dev1"
	| "dev2"
	| "testing"
	| "staging"
	| "production";

export interface EnvironmentConfig {
	name: EnvironmentName;
	displayName: string;
	awsAccount?: string;
	awsRegion: string;

	// Domain configuration
	domainName: string;
	subdomain: string;
	hostedZoneId?: string;

	// Resource sizing
	lambda: {
		memorySize: number;
		timeout: number;
		reservedConcurrency?: number;
	};

	database: {
		instanceClass: string;
		allocatedStorage: number;
		maxAllocatedStorage: number;
		multiAz: boolean;
		backupRetention: number;
		deletionProtection: boolean;
	};

	// Feature flags
	features: {
		enableWaf: boolean;
		enableCloudwatchAlarms: boolean;
		enableVpcFlowLogs: boolean;
		enableXRay: boolean;
		enableBackups: boolean;
	};

	// Tags
	tags: Record<string, string>;
}

// =============================================================================
// Environment Definitions
// =============================================================================

export const environments: Record<EnvironmentName, EnvironmentConfig> = {
	// ---------------------------------------------------------------------------
	// Development 1 - Feature Development
	// ---------------------------------------------------------------------------
	dev1: {
		name: "dev1",
		displayName: "Development 1",
		awsRegion: "us-east-1",
		domainName: "icitysystems.org",
		subdomain: "dev1.academia",
		hostedZoneId: process.env.HOSTED_ZONE_ID,

		lambda: {
			memorySize: 512,
			timeout: 30,
		},

		database: {
			instanceClass: "t3.micro",
			allocatedStorage: 20,
			maxAllocatedStorage: 50,
			multiAz: false,
			backupRetention: 1,
			deletionProtection: false,
		},

		features: {
			enableWaf: false,
			enableCloudwatchAlarms: false,
			enableVpcFlowLogs: false,
			enableXRay: false,
			enableBackups: false,
		},

		tags: {
			Environment: "dev1",
			Project: "Academia",
			CostCenter: "Development",
			ManagedBy: "CDK",
		},
	},

	// ---------------------------------------------------------------------------
	// Development 2 - Integration Testing
	// ---------------------------------------------------------------------------
	dev2: {
		name: "dev2",
		displayName: "Development 2",
		awsRegion: "us-east-1",
		domainName: "icitysystems.org",
		subdomain: "dev2.academia",
		hostedZoneId: process.env.HOSTED_ZONE_ID,

		lambda: {
			memorySize: 512,
			timeout: 30,
		},

		database: {
			instanceClass: "t3.micro",
			allocatedStorage: 20,
			maxAllocatedStorage: 50,
			multiAz: false,
			backupRetention: 3,
			deletionProtection: false,
		},

		features: {
			enableWaf: false,
			enableCloudwatchAlarms: true,
			enableVpcFlowLogs: false,
			enableXRay: false,
			enableBackups: false,
		},

		tags: {
			Environment: "dev2",
			Project: "Academia",
			CostCenter: "Development",
			ManagedBy: "CDK",
		},
	},

	// ---------------------------------------------------------------------------
	// Testing - QA Environment
	// ---------------------------------------------------------------------------
	testing: {
		name: "testing",
		displayName: "Testing",
		awsRegion: "us-east-1",
		domainName: "icitysystems.org",
		subdomain: "test.academia",
		hostedZoneId: process.env.HOSTED_ZONE_ID,

		lambda: {
			memorySize: 1024,
			timeout: 30,
		},

		database: {
			instanceClass: "t3.small",
			allocatedStorage: 50,
			maxAllocatedStorage: 100,
			multiAz: false,
			backupRetention: 7,
			deletionProtection: false,
		},

		features: {
			enableWaf: true,
			enableCloudwatchAlarms: true,
			enableVpcFlowLogs: true,
			enableXRay: true,
			enableBackups: true,
		},

		tags: {
			Environment: "testing",
			Project: "Academia",
			CostCenter: "QA",
			ManagedBy: "CDK",
		},
	},

	// ---------------------------------------------------------------------------
	// Staging - Pre-Production
	// ---------------------------------------------------------------------------
	staging: {
		name: "staging",
		displayName: "Staging",
		awsRegion: "us-east-1",
		domainName: "icitysystems.org",
		subdomain: "staging.academia",
		hostedZoneId: process.env.HOSTED_ZONE_ID,

		lambda: {
			memorySize: 1024,
			timeout: 30,
			// reservedConcurrency removed - account only has 10 total concurrent executions
		},

		database: {
			instanceClass: "t3.medium",
			allocatedStorage: 100,
			maxAllocatedStorage: 200,
			multiAz: false,
			backupRetention: 14,
			deletionProtection: true,
		},

		features: {
			enableWaf: true,
			enableCloudwatchAlarms: true,
			enableVpcFlowLogs: true,
			enableXRay: true,
			enableBackups: true,
		},

		tags: {
			Environment: "staging",
			Project: "Academia",
			CostCenter: "Staging",
			ManagedBy: "CDK",
		},
	},

	// ---------------------------------------------------------------------------
	// Production - Live Environment
	// ---------------------------------------------------------------------------
	production: {
		name: "production",
		displayName: "Production",
		awsRegion: "us-east-1",
		domainName: "icitysystems.org",
		subdomain: "academia",
		hostedZoneId: process.env.HOSTED_ZONE_ID,

		lambda: {
			memorySize: 2048,
			timeout: 30,
			// reservedConcurrency removed - account only has 10 total concurrent executions
			// Consider requesting a Lambda quota increase for production
		},

		database: {
			instanceClass: "t3.large",
			allocatedStorage: 200,
			maxAllocatedStorage: 500,
			multiAz: true,
			backupRetention: 30,
			deletionProtection: true,
		},

		features: {
			enableWaf: true,
			enableCloudwatchAlarms: true,
			enableVpcFlowLogs: true,
			enableXRay: true,
			enableBackups: true,
		},

		tags: {
			Environment: "production",
			Project: "Academia",
			CostCenter: "Production",
			ManagedBy: "CDK",
			Compliance: "FERPA",
		},
	},
};

// =============================================================================
// Helper Functions
// =============================================================================

export function getEnvironmentConfig(
	envName: string,
): EnvironmentConfig | undefined {
	return environments[envName as EnvironmentName];
}

export function isProductionEnvironment(envName: string): boolean {
	return envName === "production" || envName === "staging";
}

export function requiresApproval(envName: string): boolean {
	return envName === "production";
}
