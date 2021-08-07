import * as cdk from '@aws-cdk/core';
import rds = require('@aws-cdk/aws-rds')
import ec2 = require('@aws-cdk/aws-ec2')
import { Secret } from '@aws-cdk/aws-secretsmanager'
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns'
import { ContainerImage, Secret as ECSSecret } from '@aws-cdk/aws-ecs'

export class PackingTrackingStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const appName = 'PackingTracking'
    const multiAz = false

    const vpc = new ec2.Vpc(this, `${appName}VPC`, {
      cidr: '10.0.0.0/16',
    })

    // The code that defines your stack goes here
    const dbInstance = new rds.DatabaseInstance(this, `${appName}Instance`, {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_13 }),
      // optional, defaults to m5.large
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromGeneratedSecret('hasuraConfigSecret'), // Optional - will default to 'admin' username and generated password
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE,
      },
      deletionProtection: false,
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const hasuraAdminSecret = new Secret(this, 'HasuraAdminSecret', {
      secretName: `${appName}-HasuraAdminSecret`,
    })

    const hasuraDatabaseUrlSecret = new Secret(this, 'HasuraDatabaseUrlSecret', {
      secretName: `${appName}-HasuraDatabaseUrl`,
    })

    const hasuraJwtSecret = new Secret(this, 'HasuraJwtSecret', {
      secretName: `${appName}-HasuraJWTSecret`,
    })

    const fargate = new ApplicationLoadBalancedFargateService(this, `${appName}HasuraFargateService`, {
      serviceName: appName,
      cpu: 256,
      desiredCount: multiAz ? 2 : 1,
      taskImageOptions: {
          image: ContainerImage.fromRegistry('hasura/graphql-engine:v1.2.1'),
          containerPort: 8080,
          enableLogging: true,
          environment: {
              HASURA_GRAPHQL_ENABLE_CONSOLE: 'true',
              HASURA_GRAPHQL_PG_CONNECTIONS: '100',
              HASURA_GRAPHQL_LOG_LEVEL: 'debug',
          },
          secrets: {
              HASURA_GRAPHQL_DATABASE_URL: ECSSecret.fromSecretsManager(hasuraDatabaseUrlSecret),
              HASURA_GRAPHQL_ADMIN_SECRET: ECSSecret.fromSecretsManager(hasuraAdminSecret),
              HASURA_GRAPHQL_JWT_SECRET: ECSSecret.fromSecretsManager(hasuraJwtSecret),
          },
      },
      memoryLimitMiB: 512,
      publicLoadBalancer: false, // Default is false
      // certificate: props.certificates.hasura,
      // domainName: props.hasuraHostname,
      // domainZone: hostedZone,
      assignPublicIp: false,
  })
  }
}
