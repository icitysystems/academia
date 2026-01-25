import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

/**
 * Shared Database Stack
 *
 * Single Aurora db.t4g.micro instance shared across all environments.
 * Each environment uses a separate database within the same cluster.
 *
 * Databases created:
 * - academia_dev1
 * - academia_dev2
 * - academia_testing
 * - academia_staging
 * - academia_production
 */
export interface SharedDatabaseStackProps extends cdk.StackProps {
	vpcCidr?: string;
}

export class SharedDatabaseStack extends cdk.Stack {
	public readonly vpc: ec2.IVpc;
	public readonly cluster: rds.IDatabaseCluster;
	public readonly clusterEndpoint: string;
	public readonly clusterPort: string;
	public readonly dbSecurityGroup: ec2.ISecurityGroup;
	public readonly dbSecret: secretsmanager.ISecret;

	// Alias properties for compatibility with AcademiaAppStack
	public readonly dbEndpoint: string;
	public readonly dbPort: string;
	public readonly dbSecretArn: string;
	public readonly dbSecurityGroupId: string;

	constructor(scope: Construct, id: string, props?: SharedDatabaseStackProps) {
		super(scope, id, props);

		// ========================================================================
		// VPC for Database (shared across all environments)
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
		// Security Group for Aurora
		// ========================================================================
		this.dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
			vpc: this.vpc,
			description: "Academia shared Aurora security group",
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
		// Aurora PostgreSQL Cluster (Serverless v2 - cost-effective)
		// ========================================================================
		const cluster = new rds.DatabaseCluster(this, "SharedAuroraCluster", {
			engine: rds.DatabaseClusterEngine.auroraPostgres({
				version: rds.AuroraPostgresEngineVersion.VER_16_4,
			}),
			credentials: rds.Credentials.fromSecret(this.dbSecret),
			clusterIdentifier: "academia-shared-aurora",
			defaultDatabaseName: "academia_production", // Default DB
			writer: rds.ClusterInstance.serverlessV2("writer", {
				publiclyAccessible: false,
			}),
			serverlessV2MinCapacity: 0.5, // Minimum ACU (cost-effective)
			serverlessV2MaxCapacity: 4, // Maximum ACU (can scale up)
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
		this.clusterEndpoint = cluster.clusterEndpoint.hostname;
		this.clusterPort = cluster.clusterEndpoint.port.toString();

		// Alias properties for compatibility with AcademiaAppStack
		this.dbEndpoint = this.clusterEndpoint;
		this.dbPort = this.clusterPort;
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
			value: this.clusterEndpoint,
			description: "Aurora cluster endpoint",
			exportName: "academia-shared-db-endpoint",
		});

		new cdk.CfnOutput(this, "ClusterPort", {
			value: this.clusterPort,
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
