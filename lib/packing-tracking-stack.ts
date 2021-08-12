// import * as cdk from '@aws-cdk/core'
// import rds = require('@aws-cdk/aws-rds')
// import ec2 = require('@aws-cdk/aws-ec2')
// import { Vpc, SubnetType, InstanceType, InstanceClass, InstanceSize, Port, Protocol } from '@aws-cdk/aws-ec2'
// import { Secret } from '@aws-cdk/aws-secretsmanager'
// import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns'
// import { ContainerImage, Secret as ECSSecret, FargateService } from '@aws-cdk/aws-ecs'
import { StackProps, Stack, Construct, CfnOutput, RemovalPolicy } from '@aws-cdk/core';
import { Vpc, SubnetType, InstanceType, InstanceClass, InstanceSize, Port, Protocol } from '@aws-cdk/aws-ec2';
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns';
import { ContainerImage, Secret as ECSSecret } from '@aws-cdk/aws-ecs';
import { PublicHostedZone } from '@aws-cdk/aws-route53';
import { DatabaseInstance, DatabaseInstanceEngine, DatabaseSecret, Credentials } from '@aws-cdk/aws-rds';
import { Secret } from '@aws-cdk/aws-secretsmanager';
import { StringParameter } from '@aws-cdk/aws-ssm';
// import { Certificates } from './certificates-stack';

export class PackingTrackingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const appName = 'PackingTracking'
    const multiAz = false

    const vpc = new Vpc(this, `${appName}VPC`, {
      cidr: '10.0.0.0/16',
    })

    let hasuraConfig = {
      url: 'url',
      user: 'user'
    }

    // const templatedSecret = new Secret(this, 'hasuraConfigSecret', {
    //   generateSecretString:{
    //     secretStringTemplate: JSON.stringify(hasuraConfig),
    //     generateStringKey: 'password',
    //   },
    // })


    const passwordSecretName = `${appName}-HasuraPasswordSecret`
    const configVals = Credentials.fromGeneratedSecret('test')
    // The code that defines your stack goes here
    // const dbInstance = new rds.DatabaseInstance(this, `${appName}Instance`, {
    //   engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_13 }),
    //   // optional, defaults to m5.large
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
    //   credentials: rds.Credentials.fromGeneratedSecret('hasuraConfigSecret'), // Optional - will default to 'admin' username and generated password
    //   vpc: vpc,
    //   vpcSubnets: {
    //     subnetType: ec2.SubnetType.PRIVATE,
    //   },
    //   deletionProtection: false,
    //   deleteAutomatedBackups: true,
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    // })

    // const hasuraPasswordSecret = new Secret(this, 'HasuraPasswordSecret', {
    //   secretName: passwordSecretName,
    // })

    // const foo = hasuraPasswordSecret.secretFullArn ? hasuraPasswordSecret.secretFullArn : ''

    // const bar = cdk.SecretValue.secretsManager(foo)

    const hasuraDatabase = new DatabaseInstance(this, 'HasuraDatabase', {
      instanceIdentifier: `${appName}2`,
      databaseName: `${appName}HasuraDatabaseName`,
      engine: DatabaseInstanceEngine.POSTGRES,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE3, InstanceSize.MICRO),
      credentials: configVals,
      // masterUsername: 'syscdk',
      storageEncrypted: true,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      vpc: vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC
      },
      deletionProtection: false,
      multiAz: multiAz,
      publiclyAccessible: true,
      removalPolicy: RemovalPolicy.DESTROY,
      cloudwatchLogsExports: ["postgresql","upgrade"],
      cloudwatchLogsRetention: 7
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

    const hasuraUsername = 'hasura'

    

    const hasuraDatabaseSecret = hasuraDatabase.secret
    const hasuraUserSecret = new DatabaseSecret(this, 'HasuraDatabaseUser', {
      username: hasuraUsername,
      masterSecret: hasuraDatabaseSecret,
    })
    hasuraUserSecret.attach(hasuraDatabase)

    new CfnOutput(this, 'HasuraDatabaseMasterSecretArn', {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      value: hasuraDatabase.secret!.secretArn,
    })

    new CfnOutput(this, 'HasuraJwtSecretArn', {
      value: hasuraJwtSecret.secretArn,
    })

    new CfnOutput(this, 'HasuraDatabaseUrlSecretArn', {
      value: hasuraDatabaseUrlSecret.secretArn,
    })

    const dbUser = 'aws_master'
    // const dbPassword = configVals.
    const dbPassword = hasuraDatabaseSecret?.secretValueFromJson('password')
    const dbHost = hasuraDatabaseSecret?.secretValueFromJson('host')
    // const dbName = stage === 'prod' ? 'ivgis' : 'ivgis_dev'
    const dbName = hasuraDatabaseSecret?.secretValueFromJson('dbname')
    const dbUsername = hasuraDatabaseSecret?.secretValueFromJson('username')
    const dbUrl = `postgres://${dbUsername}:${dbPassword}@${dbHost}:5432/${dbName}`

    const fargate = new ApplicationLoadBalancedFargateService(this, `${appName}HasuraFargateService`, {
      serviceName: appName,
      cpu: 256,
      desiredCount: multiAz ? 2 : 1,
      vpc: vpc,
      taskImageOptions: {
        image: ContainerImage.fromRegistry('hasura/graphql-engine:v1.2.1'),
        containerPort: 8080,
        enableLogging: true,
        environment: {
          HASURA_GRAPHQL_ENABLE_CONSOLE: 'true',
          HASURA_GRAPHQL_PG_CONNECTIONS: '100',
          HASURA_GRAPHQL_LOG_LEVEL: 'debug',
          HASURA_GRAPHQL_DATABASE_URL: dbUrl,
        },
        secrets: {
          // HASURA_GRAPHQL_DATABASE_URL: ECSSecret.fromSecretsManager(hasuraDatabaseUrlSecret),
          // HASURA_GRAPHQL_ADMIN_SECRET: ECSSecret.fromSecretsManager(hasuraAdminSecret),
          // HASURA_GRAPHQL_JWT_SECRET: ECSSecret.fromSecretsManager(hasuraJwtSecret),
        },
      },
      memoryLimitMiB: 512,
      publicLoadBalancer: false, // Default is false
      // certificate: props.certificates.hasura,
      // domainName: props.hasuraHostname,
      // domainZone: hostedZone,
      assignPublicIp: false,
    })

    fargate.targetGroup.configureHealthCheck({
      enabled: true,
      path: '/healthz',
      healthyHttpCodes: '200',
  })

  hasuraDatabase.connections.allowFrom(fargate.service, new Port({
    protocol: Protocol.TCP,
    stringRepresentation: 'Postgres Port',
    fromPort: 5432,
    toPort: 5432,
}))
  }
}
