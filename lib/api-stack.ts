import { StackProps, Stack, Construct } from '@aws-cdk/core'
import { LambdaRestApi, CognitoUserPoolsAuthorizer, AuthorizationType } from '@aws-cdk/aws-apigateway'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs'
import { UserPool } from '@aws-cdk/aws-cognito'

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

    const userPool = new UserPool(this, `${appName}UserPool`);

    const auth = new CognitoUserPoolsAuthorizer(this, `${appName}Authorizer`, {
      cognitoUserPools: [userPool]
    })

    let backend = new NodejsFunction(this, `${appName}TestFunction`, {
      entry: 'handlers/api/handlers.ts', // accepts .js, .jsx, .ts and .tsx files
      handler: 'handlerTest', // defaults to 'handler'
    })

    const api = new LambdaRestApi(this, `${appName}-api`,{
      handler: backend,
      proxy: false
    })

    const v1 = api.root.addResource('v1')
    const test = v1.addResource('test')
    const test2 = v1.addResource('test2')
    const echoMethod = test.addMethod('GET')
    const echoMethod2 = test2.addMethod('GET', undefined, {
      authorizer: auth,
      authorizationType: AuthorizationType.COGNITO
    })
    const authRest = v1.addResource('auth')
    const getAuthRest = authRest.addMethod('GET')
  }
}
