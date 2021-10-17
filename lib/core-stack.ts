import { StackProps, Stack, Construct, CfnOutput, RemovalPolicy } from '@aws-cdk/core'
import { Vpc, SubnetType, InstanceType, InstanceClass, InstanceSize, Port, Protocol } from '@aws-cdk/aws-ec2'
import { HostedZone } from '@aws-cdk/aws-route53'
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager'
import { DatabaseInstance, DatabaseInstanceEngine, DatabaseSecret, Credentials } from '@aws-cdk/aws-rds'
import { Secret } from '@aws-cdk/aws-secretsmanager'
import { ParameterTier, StringParameter } from '@aws-cdk/aws-ssm'
import { Role } from '@aws-cdk/aws-iam'

require('dotenv').config()

type CoreStackProps = {
  projectName: string
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
  public hasuraRole: Role
  constructor(scope: Construct, id: string, props?: CoreStackProps) {
    super(scope, id, props)

    const stage = props?.stage
    const projectName = props?.projectName
    const appName = `${stage}-${projectName}`
    const multiAz = props !== undefined ? props.multiAz : false

    this.vpc = new Vpc(this, `${appName}VPC`, {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
    })

    const dbUser = 'packageAdmin'
    this.credentials = Credentials.fromGeneratedSecret(dbUser)

    this.rootDomain = process.env.URL ? process.env.URL : ''
    const zone = HostedZone.fromLookup(this, `${appName}-Zone`, { domainName: this.rootDomain })

    const createdSubdomain = this.createSubdomain(stage)
    this.subdomain = createdSubdomain

    new StringParameter(this, `${appName}Parameter`, {
      allowedPattern: '.*',
      description: `${appName} subdomain name`,
      parameterName: `${appName}SubdomainParameter`,
      stringValue: this.subdomain,
      tier: ParameterTier.ADVANCED,
    })

    this.certificate = new DnsValidatedCertificate(this, `${this.subdomain}-cert`, {
      domainName: this.subdomain,
      hostedZone: zone,
    })

    const dbProjectName = `${stage}${projectName}`
    this.databaseInstance = new DatabaseInstance(this, `${appName}HasuraDatabase`, {
      instanceIdentifier: dbProjectName,
      databaseName: `${dbProjectName}HasuraDatabase`,
      engine: DatabaseInstanceEngine.POSTGRES,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE3, InstanceSize.MICRO),
      credentials: this.credentials,
      storageEncrypted: true,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
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

    this.databaseInstance.connections.allowFromAnyIpv4(
      new Port({
        protocol: Protocol.TCP,
        stringRepresentation: 'Hasura Postgres Port Access',
        fromPort: 5432,
        toPort: 5432,
      })
    )
  }

  private createSubdomain(stage: string | undefined) {
    if (stage === undefined || new String(stage).toLocaleLowerCase() === 'prod') {
      return `graphql.${this.rootDomain}`
    }
    let formattedStage = new String(stage).toLocaleLowerCase()
    return `graphql-${formattedStage}.${this.rootDomain}`
  }
}
