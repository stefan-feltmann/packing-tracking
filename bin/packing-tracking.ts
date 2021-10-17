#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { PackingTrackingCoreStack } from '../lib/core-stack'
import { PackingTrackingHasuraStack } from '../lib/hasura-stack'
import { PackingTrackingApiStack } from '../lib/api-stack'
require('dotenv').config()

interface EnvProps {
  env: any
  stage: string
  multiAz: boolean
  projectName: string
}

class PackingTrackingService extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: EnvProps) {
    super(scope, id)

    const coreStack = new PackingTrackingCoreStack(scope, `${props.stage}${props.projectName}CoreStack`, {
      env: props.env,
      stage: props.stage,
      multiAz: props.multiAz,
      projectName: props.projectName,
    })

    const hasuraStack = new PackingTrackingHasuraStack(scope, `${props.stage}${props.projectName}HasuraStack`, {
      env: props.env,
      stage: props.stage,
      multiAz: props.multiAz,
      vpc: coreStack.vpc,
      projectName: props.projectName,
      credentials: coreStack.credentials,
      databaseInstance: coreStack.databaseInstance,
      certificate: coreStack.certificate,
      subdomain: coreStack.subdomain,
      rootDomain: coreStack.rootDomain,
    })

    const apiStack = new PackingTrackingApiStack(scope, `${props.stage}${props.projectName}ApiStack`, {
      env: props.env,
      stage: props.stage,
      multiAz: props.multiAz,
      projectName: props.projectName,
      hasuraSecret: hasuraStack.hasuraSecret,
      hasuraFargate: hasuraStack.hasuraFargate,
      databaseInstance: coreStack.databaseInstance,
      hasuraSecurityGroup: hasuraStack.hasuraSecurityGroup,
    })
  }
}

const app = new cdk.App()
const multiAz = process.env.MULTI_AZ !== undefined ? process.env.MULTI_AZ === 'true' : false
const projectName = 'PackingTracking'
new PackingTrackingService(app, 'prod', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  stage: process.env.STAGE ? process.env.STAGE : 'Dev',
  multiAz: multiAz,
  projectName: projectName,
})
