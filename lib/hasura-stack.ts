import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager'
import { ContainerImage } from '@aws-cdk/aws-ecs'
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns'
import { Vpc, Port, Protocol } from '@aws-cdk/aws-ec2'
import { Credentials, DatabaseInstance } from '@aws-cdk/aws-rds'
import { HostedZone } from '@aws-cdk/aws-route53'
import { StackProps, Stack, Construct, CfnOutput, RemovalPolicy } from '@aws-cdk/core'
import { Secret } from '@aws-cdk/aws-secretsmanager'

type HasuraStackProps = {
  stage: string
  multiAz: boolean
  vpc: Vpc
  appName: string
  credentials: Credentials
  databaseInstance: DatabaseInstance
  certificate: DnsValidatedCertificate
  subdomain: string
  rootDomain: string
  // hasuraGraphqlAdminSecret: Secret
} & StackProps

export class PackingTrackingHasuraStack extends Stack {
  constructor(scope: Construct, id: string, props?: HasuraStackProps) {
    super(scope, id, props)

    const appName = props?.appName
    const multiAz = props?.multiAz
    const dbVpc = props?.vpc
    const graphqlCert = props?.certificate
    const graphqlSubDomainName = props?.subdomain
    const rootDomain = props && props.rootDomain ? props?.rootDomain : null
    const databaseInstance = props?.databaseInstance
    // const hasuraGraphqlAdminSecret = props?.hasuraGraphqlAdminSecret

    const hasuraGraphqlAdminSecret = new Secret(this, `${appName}HasuraGraphqlAdminSecret`, {
      secretName: `${appName}-HasuraGraphqlAdminSecret`,
    })


    
    if (databaseInstance && hasuraGraphqlAdminSecret && rootDomain) {
      const zone = HostedZone.fromLookup(this, `${appName}-Zone`, { domainName: rootDomain })
      const hasuraDatabaseSecret = databaseInstance.secret

      const dbPassword = hasuraDatabaseSecret?.secretValueFromJson('password')
      const dbHost = hasuraDatabaseSecret?.secretValueFromJson('host')
      const dbName = hasuraDatabaseSecret?.secretValueFromJson('dbname')
      const dbUsername = hasuraDatabaseSecret?.secretValueFromJson('username')
      const dbUrl = `postgres://${dbUsername}:${dbPassword}@${dbHost}:5432/${dbName}`

      const fargate = new ApplicationLoadBalancedFargateService(this, `${appName}HasuraFargateService`, {
        serviceName: `${appName}`,
        // securityGroups: databaseInstance.connections.securityGroups,
        cpu: 256,
        desiredCount: multiAz ? 2 : 1,
        vpc: dbVpc,
        certificate: graphqlCert,
        domainZone: zone,
        domainName: graphqlSubDomainName,
        taskImageOptions: {
          image: ContainerImage.fromRegistry('hasura/graphql-engine:v1.2.1'),
          containerPort: 8080,
          enableLogging: true,
          environment: {
            HASURA_GRAPHQL_ENABLE_CONSOLE: 'true',
            HASURA_GRAPHQL_PG_CONNECTIONS: '100',
            HASURA_GRAPHQL_LOG_LEVEL: 'debug',
            HASURA_GRAPHQL_DATABASE_URL: dbUrl,
            HASURA_GRAPHQL_ADMIN_SECRET: hasuraGraphqlAdminSecret.secretValue.toString(),
            HASURA_GRAPHQL_JWT_SECRET:
              '{"type":"RS512", "jwk_url": "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"}',
          },
          secrets: {
            // HASURA_GRAPHQL_DATABASE_URL: ECSSecret.fromSecretsManager(hasuraDatabaseUrlSecret),
            // HASURA_GRAPHQL_ADMIN_SECRET: ECSSecret.fromSecretsManager(hasuraAdminSecret),
            // HASURA_GRAPHQL_JWT_SECRET: ECSSecret.fromSecretsManager(hasuraJwtSecret),
          },
        },
        memoryLimitMiB: 512,
        publicLoadBalancer: true, // Default is false
        // certificate: props.certificates.hasura,
        // domainName: props.hasuraHostname,
        // domainZone: hostedZone,
        assignPublicIp: true,
      })

      fargate.targetGroup.configureHealthCheck({
        enabled: true,
        path: '/healthz',
        healthyHttpCodes: '200',
      })

      // databaseInstance.connections.allowFrom(dbVpc,
      //   new Port({
      //     protocol: Protocol.TCP,
      //     stringRepresentation: 'Hasura Postgres Port Access',
      //     fromPort: 5432,
      //     toPort: 5432,
      //   }))

      // databaseInstance.connections.allowFrom(
      //   fargate.service,
      //   new Port({
      //     protocol: Protocol.TCP,
      //     stringRepresentation: 'Hasura Postgres Port Access',
      //     fromPort: 5432,
      //     toPort: 5432,
      //   })
      // )
    } else {
      console.log(hasuraGraphqlAdminSecret)
      throw new Error("else");
      
    }
  }
}
