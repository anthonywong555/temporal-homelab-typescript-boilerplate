import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { spanToTraceHeader, getDynamicSamplingContextFromSpan } from '@sentry/core';
import { dynamicSamplingContextToSentryBaggageHeader } from '@sentry/utils';
import { Connection, Client, ScheduleOverlapPolicy } from '@temporalio/client';
import { example } from './workflows/example/workflow';
import { customSchedule, type ScheduleRequest } from './workflows/schedules/index';
import { nanoid } from 'nanoid';
import { getConnectionOptions, getenv, namespace, taskQueue } from './env';

export const sentryDNS = getenv('SENTRY_DNS', '');

if(sentryDNS) {
  Sentry.init({
    dsn: sentryDNS,
    integrations: [
      nodeProfilingIntegration()
    ],

    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0
  });

  console.info('🤖: Sentry Online');
}


async function run() {
  console.log(`Hello`);
  const connection = await Connection.connect(await getConnectionOptions());

  const client = new Client({
    connection,
    namespace
  });
  const name = 'Anthony';
  await Sentry.startSpan({
    name: 'example',
    op: 'queue.publish',
    attributes: {
      name
    }
  }, async(span) => {
    const traceHeader = spanToTraceHeader(span);
    const dynamicSamplingContext = getDynamicSamplingContextFromSpan(span);
    const baggageHeader = dynamicSamplingContextToSentryBaggageHeader(dynamicSamplingContext);

    await client.workflow.start(example, {
      name,
      traceHeader,
      baggageHeader
    });

    console.log(`Workflow Fired`);
  });
  /*
  const promises = [];
  const NUM_CALLS = 1;
  for (let i = 0; i < NUM_CALLS; i++) {
    promises.push(client.workflow.start(example, {
      taskQueue,
      args: ['Temporal'],
      workflowId: `workflow-${nanoid()}`
    }));
  }
  console.info(`Started ${NUM_CALLS} workflows`);

  const handles = await Promise.all(promises);

  console.info(`Done`);
  */
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});