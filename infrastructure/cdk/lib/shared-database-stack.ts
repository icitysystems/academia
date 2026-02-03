import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

/**
 * Shared Database Stack
 *
 * References existing RDS PostgreSQL db.t3.micro instance (icitysystems)
 * with database 'academia'.
 *
 * Existing RDS Instance Specifications:
 * - Instance: icitysystems (db.t3.micro)
 * - Engine: PostgreSQL 15.x
 * - Storage: 20 GB gp2 SSD
 * - Database: academia
 * - Multi-AZ: No
 * - Public Access: No (VPC only)
 * - Region: us-east-1
 *
 * This stack creates VPC infrastructure and references the existing
 * database credentials in Secrets Manager.
 */
export interface SharedDatabaseStackProps extends cdk.StackProps {
	vpcCidr?: string;
	/**
	 * Existing RDS instance endpoint (without port)
	 * Default: icitysystems.cnpejzsnelnc.us-east-1.rds.amazonaws.com
	 */
	rdsEndpoint?: string;
	/**
	 * RDS port
	 * Default: 5432
	 */
	rdsPort?: string;
	/**
	 * ARN of existing Secrets Manager secret with database credentials
	 * The secret should contain: { "username": "...", "password": "..." }
	 */
	existingSecretArn?: string;
}

export class SharedDatabaseStack extends cdk.Stack {
	public readonly vpc: ec2.IVpc;
	public readonly dbSecurityGroup: ec2.ISecurityGroup;
	public readonly dbSecret: secretsmanager.ISecret;

	// Database connection properties
	public readonly dbEndpoint: string;
	public readonly dbPort: string;
	public readonly dbSecretArn: string;
	public readonly dbSecurityGroupId: string;

	// Database specifications (for documentation and cost estimation)
	public static readonly RDS_SPECIFICATIONS = {
		instanceIdentifier: "icitysystems",
		instanceClass: "db.t3.micro",
		engine: "postgres",
		engineVersion: "15",
		storageType: "gp2",
		allocatedStorage: 20,
		maxAllocatedStorage: 100,
		multiAZ: false,
		publiclyAccessible: false,
		databaseName: "academia",
		port: 5432,
	};

	constructor(scope: Construct, id: string, props?: SharedDatabaseStackProps) {
		super(scope, id, props);

		// RDS Instance endpoint (existing icitysystems instance)
		const rdsEndpoint =
			props?.rdsEndpoint ||
			"icitysystems.cnpejzsnelnc.us-east-1.rds.amazonaws.com";
		const rdsPort = props?.rdsPort || "5432";

		// ========================================================================
		// VPC for Lambda Functions (to connect to RDS)
		// NOTE: Construct ID "SharedVpc" matches deployed stack
		// ========================================================================
		this.vpc = new ec2.Vpc(this, "SharedVpc", {
			vpcName: "academia-shared-vpc",
			maxAzs: 2,
			natGateways: 0, // No NAT gateways to reduce cost
			subnetConfiguration: [
				{
					name: "Public",
					subnetType: ec2.SubnetType.PUBLIC,
					cidrMask: 24,
				},
				{
					name: "Isolated",
					subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					cidrMask: 24,
				},
			],
		});

		// VPC Endpoints for AWS services (to allow Lambda in isolated subnets)
		this.vpc.addInterfaceEndpoint("SecretsManagerEndpoint", {
			service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
		});

		// ========================================================================
		// Security Group for accessing RDS
		// NOTE: Construct ID "DbSecurityGroup" matches deployed stack
		// ========================================================================
		this.dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
			vpc: this.vpc,
			description: "Academia RDS PostgreSQL access security group",
			allowAllOutbound: true,
		});

		// Allow outbound to RDS port (for Lambda to connect to existing RDS)
		this.dbSecurityGroup.addEgressRule(
			ec2.Peer.anyIpv4(),
			ec2.Port.tcp(5432),
			"Allow PostgreSQL outbound to RDS",
		);

		// ========================================================================
		// Database Credentials
		// NOTE: Construct ID "DbSecret" matches deployed stack
		// Reference existing secret or create new one for the icitysystems RDS
		// ========================================================================
		if (props?.existingSecretArn) {
			// Use existing secret
			this.dbSecret = secretsmanager.Secret.fromSecretCompleteArn(
				this,
				"DbSecret",
				props.existingSecretArn,
			);
		} else {
			// Create new secret (credentials should be manually set to match existing RDS)
			this.dbSecret = new secretsmanager.Secret(this, "DbSecret", {
				secretName: "academia/shared/database/credentials",
				description:
					"Academia database credentials for icitysystems RDS instance",
				generateSecretString: {
					secretStringTemplate: JSON.stringify({
						username: "academia_admin",
						host: rdsEndpoint,
						port: parseInt(rdsPort),
						dbname: "academia",
						engine: "postgres",
					}),
					generateStringKey: "password",
					excludePunctuation: true,
					passwordLength: 32,
				},
			});
		}

		// Set connection properties
		this.dbEndpoint = rdsEndpoint;
		this.dbPort = rdsPort;
		this.dbSecretArn = this.dbSecret.secretArn;
		this.dbSecurityGroupId = this.dbSecurityGroup.securityGroupId;

		// ========================================================================
		// Outputs
		// ========================================================================
		new cdk.CfnOutput(this, "VpcId", {
			value: this.vpc.vpcId,
			description: "Shared VPC ID",
			exportName: "academia-shared-vpc-id",
		});

		new cdk.CfnOutput(this, "DbEndpoint", {
			value: this.dbEndpoint,
			description: "RDS PostgreSQL endpoint (icitysystems)",
			exportName: "academia-shared-db-endpoint",
		});

		new cdk.CfnOutput(this, "DbPort", {
			value: this.dbPort,
			description: "RDS PostgreSQL port",
			exportName: "academia-shared-db-port",
		});

		new cdk.CfnOutput(this, "DbSecretArn", {
			value: this.dbSecret.secretArn,
			description: "Database credentials secret ARN",
			exportName: "academia-shared-db-secret-arn",
		});

		new cdk.CfnOutput(this, "DbSecurityGroupId", {
			value: this.dbSecurityGroup.securityGroupId,
			description: "Database access security group ID",
			exportName: "academia-shared-db-sg-id",
		});

		new cdk.CfnOutput(this, "RdsSpecifications", {
			value: JSON.stringify(SharedDatabaseStack.RDS_SPECIFICATIONS, null, 2),
			description: "RDS instance specifications",
		});
	}
}
