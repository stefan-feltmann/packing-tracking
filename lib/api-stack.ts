import { StackProps, Stack, Construct } from '@aws-cdk/core'
import { LambdaRestApi } from '@aws-cdk/aws-apigateway'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs'

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

    let backend = new NodejsFunction(this, `${appName}LambdaFunction`, {
      entry: 'handlers/api/handlers.ts', // accepts .js, .jsx, .ts and .tsx files
      handler: 'handlers', // defaults to 'handler'
    })

    const api = new LambdaRestApi(this, `${appName}-api`, {
      handler: backend,
      proxy: false,
    })

    const v1 = api.root.addResource('v1')
    const authRest = v1.addResource('auth')
    const getAuthRest = authRest.addMethod('GET')
    const postAuthRest = authRest.addMethod('POST')
    const userRest = v1.addResource('user')
    const getUserRest = userRest.addMethod('GET')
    const postUserRest = userRest.addMethod('POST')
  }
}
