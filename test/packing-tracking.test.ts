import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import * as PackingTracking from '../lib/core-stack'
require('dotenv').config()

test('Empty Stack', () => {
  // const app = new cdk.App()
  // // WHEN
  // const stack = new PackingTracking.PackingTrackingCoreStack(app, 'MyTestStack')
  // // THEN
  // expectCDK(stack).to(
  //   matchTemplate(
  //     {
  //       Resources: {},
  //     },
  //     MatchStyle.EXACT
  //   )
  // )
})
