import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager'
import { ContainerImage, FargateService } from '@aws-cdk/aws-ecs'
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns'
import { Peer, Port, SecurityGroup, Vpc } from '@aws-cdk/aws-ec2'
import { Credentials, DatabaseInstance } from '@aws-cdk/aws-rds'
import { HostedZone } from '@aws-cdk/aws-route53'
import { StackProps, Stack, Construct, CustomResource } from '@aws-cdk/core'
import { Secret } from '@aws-cdk/aws-secretsmanager'
import { StringParameter } from '@aws-cdk/aws-ssm'

type HasuraStackProps = {
  stage: string
  multiAz: boolean
  vpc: Vpc
  projectName: string
  credentials: Credentials
  databaseInstance: DatabaseInstance
  certificate: DnsValidatedCertificate
  subdomain: string
  rootDomain: string
} & StackProps

export class PackingTrackingHasuraStack extends Stack {
  public hasuraSecret: Secret
  public hasuraFargate: ApplicationLoadBalancedFargateService
  public hasuraSecurityGroup: SecurityGroup
  constructor(scope: Construct, id: string, props?: HasuraStackProps) {
    super(scope, id, props)

    const stage = props?.stage
    const projectName = props?.projectName
    const appName = `${stage}-${projectName}`
    const multiAz = props?.multiAz
    const dbVpc = props?.vpc
    const graphqlCert = props?.certificate
    const graphqlSubDomainName = props?.subdomain
    const rootDomain = props && props.rootDomain ? props?.rootDomain : null
    const databaseInstance = props?.databaseInstance

    const hasuraGraphqlAdminSecret = new Secret(this, `${appName}HasuraGraphqlAdminSecret`, {
      secretName: `${appName}-HasuraGraphqlAdminSecret`,
    })

    this.hasuraSecret = hasuraGraphqlAdminSecret

    if (databaseInstance && hasuraGraphqlAdminSecret && rootDomain && dbVpc) {
      const zone = HostedZone.fromLookup(this, `${appName}-Zone`, { domainName: rootDomain })
      const hasuraDatabaseSecret = databaseInstance.secret

      const dbPassword = hasuraDatabaseSecret?.secretValueFromJson('password')
      const dbHost = hasuraDatabaseSecret?.secretValueFromJson('host')
      const dbName = hasuraDatabaseSecret?.secretValueFromJson('dbname')
      const dbUsername = hasuraDatabaseSecret?.secretValueFromJson('username')
      const dbUrl = `postgres://${dbUsername}:${dbPassword}@${dbHost}:5432/${dbName}`

      const hasuraSecurityGroup = new SecurityGroup(this, `${appName}HasuraSecurityGroup`, {
        securityGroupName: `${appName}HasuraSecurityGroup`,
        vpc: dbVpc,
        description: `Allowing ${appName} components to connect`,
        allowAllOutbound: true,
        disableInlineRules: true,
      })

      const fargate = new ApplicationLoadBalancedFargateService(this, `${appName}HasuraFargateService`, {
        serviceName: `${appName}`,
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
        },
        memoryLimitMiB: 512,
        publicLoadBalancer: true,
        assignPublicIp: true,
      })

      let loadBalancerDnsName: string = fargate.loadBalancer.loadBalancerDnsName

      this.hasuraFargate = fargate

      // fargate.

      //This will add the rule as an external cloud formation construct
      hasuraSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22), 'allow ssh access from the world')
      hasuraSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(8080), 'allow 8080 access from the world')
      hasuraSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(8081), 'allow 8081 access from the world')

      this.hasuraFargate.loadBalancer.addSecurityGroup(hasuraSecurityGroup)

      new StringParameter(this, `${appName}HasuraLoadBalancerDnsName`, {
        // description: 'Some user-friendly description',
        // name: 'ParameterName',
        parameterName: `${appName}HasuraLoadBalancerDnsName`,
        stringValue: loadBalancerDnsName,
        // allowedPattern: '.*',
      })

      if (hasuraGraphqlAdminSecret.secretFullArn) {
        new StringParameter(this, `${appName}HasuraGraphqlAdminSecretArn`, {
          // description: 'Some user-friendly description',
          // name: 'ParameterName',
          parameterName: `${appName}HasuraGraphqlAdminSecretArn`,
          stringValue: hasuraGraphqlAdminSecret.secretFullArn,
          // allowedPattern: '.*',
        })
      }

      fargate.targetGroup.configureHealthCheck({
        enabled: true,
        path: '/healthz',
        healthyHttpCodes: '200',
      })
    } else {
      throw new Error('PackingTrackingHasuraStack props error')
    }
  }
}
