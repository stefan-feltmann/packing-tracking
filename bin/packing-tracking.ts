#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { PackingTrackingCoreStack } from '../lib/packing-tracking-stack'
import { PackingTrackingHasuraStack } from '../lib/hasura-stack'
require('dotenv').config()

interface EnvProps {
  env: any
  stage: string
}

class PackingTrackingService extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: EnvProps) {
    super(scope, id)

    const multiAz = false

    const coreStack = new PackingTrackingCoreStack(scope, 'PackingTrackingCoreStack', {
      env: props.env,
      stage: props.stage,
      multiAz,
    })

    // type HasuraStackProps = {
    //   stage: string
    //   multiAz: boolean
    //   vpc: Vpc
    //   appName: string
    //   credentials: Credentials
    //   databaseInstance: DatabaseInstance
    //   certificate: DnsValidatedCertificate
    //   subdomain: string
    //   rootDomain: string
    //   hasuraGraphqlAdminSecret: Secret
    // } & StackProps

    const hasuraStack = new PackingTrackingHasuraStack(scope, 'PackingTrackingHasuraStack', {
      env: props.env,
      stage: props.stage,
      multiAz,
      vpc: coreStack.vpc,
      appName: 'PackingTracking',
      credentials: coreStack.credentials,
      databaseInstance: coreStack.databaseInstance,
      certificate: coreStack.certificate,
      subdomain: coreStack.subdomain,
      rootDomain: coreStack.rootDomain,
      hasuraGraphqlAdminSecret: coreStack.hasuraGraphqlAdminSecret,
    })
  }
}

const app = new cdk.App()
new PackingTrackingService(app, 'prod', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  stage: 'prod',
})
