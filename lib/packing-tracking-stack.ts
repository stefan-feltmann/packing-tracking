import { StackProps, Stack, Construct, CfnOutput, RemovalPolicy } from '@aws-cdk/core'
import { Vpc, SubnetType, InstanceType, InstanceClass, InstanceSize, Port, Protocol } from '@aws-cdk/aws-ec2'
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns'
import { ContainerImage } from '@aws-cdk/aws-ecs'
import { HostedZone } from '@aws-cdk/aws-route53'
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager'
import { DatabaseInstance, DatabaseInstanceEngine, DatabaseSecret, Credentials } from '@aws-cdk/aws-rds'
import { Secret } from '@aws-cdk/aws-secretsmanager'

require('dotenv').config()

type CoreStackProps = {
  stage: string
  multiAz: boolean
} & StackProps

export class PackingTrackingCoreStack extends Stack {
  public vpc: Vpc
  public credentials: Credentials
  public databaseInstance: DatabaseInstance
  public certificate: DnsValidatedCertificate
  public subdomain: string
  public rootDomain: string
  public hasuraGraphqlAdminSecret: Secret
  constructor(scope: Construct, id: string, props?: CoreStackProps) {
    super(scope, id, props)

    const appName = 'PackingTracking'
    const multiAz = props !== undefined ? props.multiAz : false

    this.vpc = new Vpc(this, `${appName}VPC`, {
      cidr: '10.0.0.0/16',
    })

    const dbUser = 'packageAdmin'
    this.credentials = Credentials.fromGeneratedSecret(dbUser)

    this.rootDomain = process.env.URL ? process.env.URL : ''
    const zone = HostedZone.fromLookup(this, `${appName}-Zone`, { domainName: this.rootDomain })

    this.subdomain = `graphql.${this.rootDomain}`
    this.certificate = new DnsValidatedCertificate(this, `${this.subdomain}-cert`, {
      domainName: this.subdomain,
      hostedZone: zone,
    })

    this.databaseInstance = new DatabaseInstance(this, `${appName}HasuraDatabase`, {
      instanceIdentifier: `${appName}`,
      databaseName: `${appName}HasuraDatabase`,
      engine: DatabaseInstanceEngine.POSTGRES,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE3, InstanceSize.MICRO),
      credentials: this.credentials,
      storageEncrypted: true,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE,
      },
      deletionProtection: false,
      multiAz: multiAz,
      publiclyAccessible: true,
      removalPolicy: RemovalPolicy.DESTROY,
      cloudwatchLogsExports: ['postgresql', 'upgrade'],
      cloudwatchLogsRetention: 7,
    })

    const hasuraDatabaseUrlSecret = new Secret(this, `${appName}HasuraDatabaseUrlSecret`, {
      secretName: `${appName}-HasuraDatabaseUrl`,
    })

    const hasuraGraphqlAdminSecret = new Secret(this, `${appName}HasuraGraphqlAdminSecret`, {
      secretName: `${appName}-HasuraGraphqlAdminSecret`,
    })

    const hasuraJwtSecret = new Secret(this, `${appName}HasuraJwtSecret`, {
      secretName: `${appName}-HasuraJWTSecret`,
    })

    const hasuraUsername = 'hasura'

    const hasuraDatabaseSecret = this.databaseInstance.secret
    const hasuraUserSecret = new DatabaseSecret(this, `${appName}HasuraDatabaseUser`, {
      username: hasuraUsername,
      masterSecret: hasuraDatabaseSecret,
    })
    hasuraUserSecret.attach(this.databaseInstance)

    new CfnOutput(this, `${appName}HasuraDatabaseMasterSecretArn`, {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      value: this.databaseInstance.secret!.secretArn,
    })

    new CfnOutput(this, `${appName}HasuraJwtSecretArn`, {
      value: hasuraJwtSecret.secretArn,
    })

    new CfnOutput(this, `${appName}HasuraDatabaseUrlSecretArn`, {
      value: hasuraDatabaseUrlSecret.secretArn,
    })

    const dbPassword = hasuraDatabaseSecret?.secretValueFromJson('password')
    const dbHost = hasuraDatabaseSecret?.secretValueFromJson('host')
    const dbName = hasuraDatabaseSecret?.secretValueFromJson('dbname')
    const dbUsername = hasuraDatabaseSecret?.secretValueFromJson('username')
    const dbUrl = `postgres://${dbUsername}:${dbPassword}@${dbHost}:5432/${dbName}`

    // const fargate = new ApplicationLoadBalancedFargateService(this, `${appName}HasuraFargateService`, {
    //   serviceName: `${appName}`,
    //   cpu: 256,
    //   desiredCount: multiAz ? 2 : 1,
    //   vpc: this.vpc,
    //   certificate: this.certificate,
    //   domainZone: zone,
    //   domainName: this.subdomain,
    //   taskImageOptions: {
    //     image: ContainerImage.fromRegistry('hasura/graphql-engine:v1.2.1'),
    //     containerPort: 8080,
    //     enableLogging: true,
    //     environment: {
    //       HASURA_GRAPHQL_ENABLE_CONSOLE: 'true',
    //       HASURA_GRAPHQL_PG_CONNECTIONS: '100',
    //       HASURA_GRAPHQL_LOG_LEVEL: 'debug',
    //       HASURA_GRAPHQL_DATABASE_URL: dbUrl,
    //       HASURA_GRAPHQL_ADMIN_SECRET: hasuraGraphqlAdminSecret.secretValue.toString(),
    //       HASURA_GRAPHQL_JWT_SECRET:
    //         '{"type":"RS512", "jwk_url": "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"}',
    //     },
    //     secrets: {
    //       // HASURA_GRAPHQL_DATABASE_URL: ECSSecret.fromSecretsManager(hasuraDatabaseUrlSecret),
    //       // HASURA_GRAPHQL_ADMIN_SECRET: ECSSecret.fromSecretsManager(hasuraAdminSecret),
    //       // HASURA_GRAPHQL_JWT_SECRET: ECSSecret.fromSecretsManager(hasuraJwtSecret),
    //     },
    //   },
    //   memoryLimitMiB: 512,
    //   publicLoadBalancer: true, // Default is false
    //   // certificate: props.certificates.hasura,
    //   // domainName: props.hasuraHostname,
    //   // domainZone: hostedZone,
    //   assignPublicIp: false,
    // })

    // fargate.targetGroup.configureHealthCheck({
    //   enabled: true,
    //   path: '/healthz',
    //   healthyHttpCodes: '200',
    // })

    // this.databaseInstance.connections.allowFrom(
    //   fargate.service,
    //   new Port({
    //     protocol: Protocol.TCP,
    //     stringRepresentation: 'Hasura Postgres Port Access',
    //     fromPort: 5432,
    //     toPort: 5432,
    //   })
    // )
  }
}
