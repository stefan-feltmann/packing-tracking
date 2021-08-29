import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager'
import { ContainerImage } from '@aws-cdk/aws-ecs'
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns'
import { Vpc } from '@aws-cdk/aws-ec2'
import { Credentials, DatabaseInstance } from '@aws-cdk/aws-rds'
import { HostedZone } from '@aws-cdk/aws-route53'
import { StackProps, Stack, Construct } from '@aws-cdk/core'
import { RestApi } from '@aws-cdk/aws-apigateway'
import { Secret } from '@aws-cdk/aws-secretsmanager'

type ApiStackProps = {
  stage: string
  multiAz: boolean
  projectName: string
} & StackProps

export class PackingTrackingApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: ApiStackProps) {
    super(scope, id, props)

    const stage = props?.stage
    const projectName = props?.projectName
    const appName = `${stage}-${projectName}`

    const api = new RestApi(this, `${appName}-api`)

    const v1 = api.root.addResource('v1')
    const echo = v1.addResource('echo')
    const echoMethod = echo.addMethod('GET')
  }
}
