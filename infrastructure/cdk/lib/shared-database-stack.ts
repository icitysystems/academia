import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

/**
 * Shared Database Stack
 *
 * Aurora PostgreSQL Serverless v2 cluster for production.
 *
 * NOTE: The construct IDs must match the deployed CloudFormation stack.
 * Do NOT change construct IDs without migrating the deployed resources.
 *
 * Database: academia
 */
export interface SharedDatabaseStackProps extends cdk.StackProps {
	vpcCidr?: string;
}

export class SharedDatabaseStack extends cdk.Stack {
	public readonly vpc: ec2.IVpc;
	public readonly cluster: rds.IDatabaseCluster;
	public readonly dbSecurityGroup: ec2.ISecurityGroup;
	public readonly dbSecret: secretsmanager.ISecret;

	// Alias properties for compatibility with AcademiaAppStack
	public readonly dbEndpoint: string;
	public readonly dbPort: string;
	public readonly dbSecretArn: string;
	public readonly dbSecurityGroupId: string;

	// Legacy alias for backward compatibility
	public readonly dbInstance: rds.IDatabaseCluster;

	constructor(scope: Construct, id: string, props?: SharedDatabaseStackProps) {
		super(scope, id, props);

		// ========================================================================
		// VPC for Database (shared across all environments)
		// NOTE: Construct ID "SharedVpc" matches deployed stack
		// ========================================================================
		this.vpc = new ec2.Vpc(this, "SharedVpc", {
			vpcName: "academia-shared-vpc",
			maxAzs: 2,
			natGateways: 0,
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

		// VPC Endpoints for AWS services
		this.vpc.addInterfaceEndpoint("SecretsManagerEndpoint", {
			service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
		});

		// ========================================================================
		// Security Group for RDS PostgreSQL
		// NOTE: Construct ID "DbSecurityGroup" matches deployed stack
		// ========================================================================
		this.dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
			vpc: this.vpc,
			description: "Academia RDS PostgreSQL security group",
			allowAllOutbound: false,
		});

		// Allow inbound from anywhere in VPC (Lambda functions)
		this.dbSecurityGroup.addIngressRule(
			ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
			ec2.Port.tcp(5432),
			"Allow PostgreSQL from VPC",
		);

		// ========================================================================
		// Database Credentials
		// NOTE: Construct ID "DbSecret" matches deployed stack
		// ========================================================================
		this.dbSecret = new secretsmanager.Secret(this, "DbSecret", {
			secretName: "academia/shared/database/credentials",
			description: "Academia shared database credentials",
			generateSecretString: {
				secretStringTemplate: JSON.stringify({ username: "academia_admin" }),
				generateStringKey: "password",
				excludePunctuation: true,
				passwordLength: 32,
			},
		});

		// ========================================================================
		// Aurora PostgreSQL Serverless v2 Cluster
		// NOTE: Construct ID "SharedAuroraCluster" matches deployed stack
		// ========================================================================
		const cluster = new rds.DatabaseCluster(this, "SharedAuroraCluster", {
			engine: rds.DatabaseClusterEngine.auroraPostgres({
				version: rds.AuroraPostgresEngineVersion.VER_16_4,
			}),
			credentials: rds.Credentials.fromSecret(this.dbSecret),
			defaultDatabaseName: "academia",
			serverlessV2MinCapacity: 0.5,
			serverlessV2MaxCapacity: 2,
			writer: rds.ClusterInstance.serverlessV2("writer"),
			vpc: this.vpc,
			vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
			securityGroups: [this.dbSecurityGroup],
			storageEncrypted: true,
			backup: {
				retention: cdk.Duration.days(7),
			},
			deletionProtection: true,
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		});

		this.cluster = cluster;
		this.dbInstance = cluster; // Legacy alias

		// Alias properties for compatibility with AcademiaAppStack
		this.dbEndpoint = cluster.clusterEndpoint.hostname;
		this.dbPort = cluster.clusterEndpoint.port.toString();
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

		new cdk.CfnOutput(this, "ClusterEndpoint", {
			value: this.dbEndpoint,
			description: "Aurora cluster endpoint",
			exportName: "academia-shared-db-endpoint",
		});

		new cdk.CfnOutput(this, "ClusterPort", {
			value: this.dbPort,
			description: "Aurora cluster port",
			exportName: "academia-shared-db-port",
		});

		new cdk.CfnOutput(this, "DbSecretArn", {
			value: this.dbSecret.secretArn,
			description: "Database credentials secret ARN",
			exportName: "academia-shared-db-secret-arn",
		});

		new cdk.CfnOutput(this, "DbSecurityGroupId", {
			value: this.dbSecurityGroup.securityGroupId,
			description: "Database security group ID",
			exportName: "academia-shared-db-sg-id",
		});
	}
}
