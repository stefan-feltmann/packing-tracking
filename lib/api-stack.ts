import { StackProps, Stack, Construct, Duration, SecretValue } from '@aws-cdk/core'
import { AccessLogFormat, HttpIntegration, Integration, LambdaRestApi, LogGroupLogDestination, TokenAuthorizer } from '@aws-cdk/aws-apigateway'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs'
import { StringParameter } from '@aws-cdk/aws-ssm'
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam'
import { ISecret, Secret } from '@aws-cdk/aws-secretsmanager'
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns'
import { SecurityGroup } from '@aws-cdk/aws-ec2'
import { DatabaseInstance } from '@aws-cdk/aws-rds'
import { LogGroup } from '@aws-cdk/aws-logs'

type ApiStackProps = {
  stage: string
  multiAz: boolean
  projectName: string
  hasuraSecret: Secret
  hasuraFargate: ApplicationLoadBalancedFargateService
  databaseInstance: DatabaseInstance
  hasuraSecurityGroup: SecurityGroup
} & StackProps

export class PackingTrackingApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: ApiStackProps) {
    super(scope, id, props)

    const stage = props?.stage
    const projectName = props?.projectName
    const secretName = props?.hasuraSecret && props?.hasuraSecret.secretName ? props?.hasuraSecret.secretName : ''
    const appName = `${stage}-${projectName}`
    const databaseInstance = props?.databaseInstance

    // const myRole = new Role(this, 'My Role', {
    //   assumedBy: new ServicePrincipal('sns.amazonaws.com'),
    // });

    const dnsName = StringParameter.fromStringParameterAttributes(this, `${appName}HasuraLoadBalancerDnsName`, {
      parameterName: `${appName}HasuraLoadBalancerDnsName`,
      // 'version' can be specified but is optional.
    }).stringValue

    if (databaseInstance) {
      const hasuraDatabaseSecret = databaseInstance.secret

      const dbPassword = getSecretValue(hasuraDatabaseSecret, 'password')
      const dbHost = getSecretValue(hasuraDatabaseSecret, 'host')
      const dbName = getSecretValue(hasuraDatabaseSecret, 'dbname')
      const dbUsername = getSecretValue(hasuraDatabaseSecret, 'username')

      let backend = new NodejsFunction(this, `${appName}LambdaFunction`, {
        entry: 'handlers/api/handlers.ts', // accepts .js, .jsx, .ts and .tsx files
        handler: 'handlers', // defaults to 'handler'
        environment: {
          HASURA_LOAD_BALANCER_DNS_NAME: dnsName,
          SECRET_NAME: secretName,
          DB_PASSWORD: dbPassword,
          DB_HOST: dbHost,
          DB_NAME: dbName,
          DB_USERNAME: dbUsername,
        },
        timeout: Duration.seconds(60),
        vpc: databaseInstance.vpc,
      })

      databaseInstance.grantConnect(backend)

      props?.hasuraSecret.grantRead(backend)

      const logGroup = new LogGroup(this, `${appName}ApiGatewayAccessLogs`)

      const api = new LambdaRestApi(this, `${appName}Api`, {
        handler: backend,
        proxy: false,
        deployOptions: {
          accessLogDestination: new LogGroupLogDestination(logGroup),
          accessLogFormat: AccessLogFormat.custom(
           '{"requestTime":"$context.requestTime","requestId":"$context.requestId","httpMethod":"$context.httpMethod","path":"$context.path","resourcePath":"$context.resourcePath","status":$context.status,"responseLatency":$context.responseLatency}' 
          )
        }
      })

      // let authFunc= new NodejsFunction(this, `${appName}LambdaFunctionAuth`, {
      //   entry: 'handlers/api/authorizer.ts', // accepts .js, .jsx, .ts and .tsx files
      //   handler: 'handler', // defaults to 'handler',
      //   timeout: Duration.seconds(60),
      // })

      // const auth = new TokenAuthorizer(this, `${appName}LambdaFunctionAuthorizer`, {
      //   handler: authFunc
      // })

      const v1 = api.root.addResource('v1')
      const authRest = v1.addResource('auth')
      const getAuthRest = authRest.addMethod('GET')
      const postAuthRest = authRest.addMethod('POST')
      const userRest = v1.addResource('user')
      const getUserRest = userRest.addMethod('GET')
      const postUserRest = userRest.addMethod('POST')
      const putUserRest = userRest.addMethod('PUT')
      const deleteUserRest = userRest.addMethod('DELETE')
      const userRestId = userRest.addResource('{id}')
      const getuserRestId = userRestId.addMethod('GET')
      const postuserRestId = userRestId.addMethod('POST')
      const putuserRestId = userRestId.addMethod('PUT')
      const deleteuserRestId = userRestId.addMethod('DELETE')
    }

    function getSecretValue(hasuraDatabaseSecret: ISecret | undefined, value: string) {
      let output = ''
      if (hasuraDatabaseSecret && hasuraDatabaseSecret.secretValueFromJson) {
        let jsonStrings: SecretValue = hasuraDatabaseSecret?.secretValueFromJson(value)
        output = jsonStrings.toString()
      }
      return output
    }
  }
}
