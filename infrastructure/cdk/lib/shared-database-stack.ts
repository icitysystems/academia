import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

/**
 * Shared Database Stack
 *
 * Single RDS PostgreSQL db.t3.micro instance for production.
 *
 * Database: academia
 * Instance: icitysystems
 */
export interface SharedDatabaseStackProps extends cdk.StackProps {
	vpcCidr?: string;
}

export class SharedDatabaseStack extends cdk.Stack {
	public readonly vpc: ec2.IVpc;
	public readonly dbInstance: rds.IDatabaseInstance;
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
		// Security Group for RDS PostgreSQL
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
		// RDS PostgreSQL Instance (db.t3.micro)
		// ========================================================================
		const dbInstance = new rds.DatabaseInstance(this, "PostgresInstance", {
			engine: rds.DatabaseInstanceEngine.postgres({
				version: rds.PostgresEngineVersion.VER_16_4,
			}),
			credentials: rds.Credentials.fromSecret(this.dbSecret),
			instanceIdentifier: "icitysystems",
			databaseName: "academia",
			instanceType: ec2.InstanceType.of(
				ec2.InstanceClass.T3,
				ec2.InstanceSize.MICRO,
			),
			vpc: this.vpc,
			vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
			securityGroups: [this.dbSecurityGroup],
			storageEncrypted: true,
			allocatedStorage: 20,
			maxAllocatedStorage: 100,
			backupRetention: cdk.Duration.days(7),
			deletionProtection: true,
			removalPolicy: cdk.RemovalPolicy.RETAIN,
			publiclyAccessible: false,
		});

		this.dbInstance = dbInstance;

		// Alias properties for compatibility with AcademiaAppStack
		this.dbEndpoint = dbInstance.dbInstanceEndpointAddress;
		this.dbPort = dbInstance.dbInstanceEndpointPort;
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

		new cdk.CfnOutput(this, "DbInstanceEndpoint", {
			value: this.dbEndpoint,
			description: "RDS PostgreSQL instance endpoint",
			exportName: "academia-shared-db-endpoint",
		});

		new cdk.CfnOutput(this, "DbInstancePort", {
			value: this.dbPort,
			description: "RDS PostgreSQL instance port",
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
