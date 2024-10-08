import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { spanToTraceHeader, getDynamicSamplingContextFromSpan } from '@sentry/core';
import { dynamicSamplingContextToSentryBaggageHeader } from '@sentry/utils';
import { Connection, Client } from '@temporalio/client';
import { example } from './workflows/example/workflow';
import { nanoid } from 'nanoid';
import { getConnectionOptions, getenv, namespace, taskQueue } from './env';
import type { ExampleRequest } from './workflows/example/types';

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

  const workflowId = `workflow-${nanoid()}`;

  const name = 'Anthony';
  await Sentry.startSpan({
    name: 'WorkflowExecutionScheduled',
    op: 'queue.publish',
    attributes: {
      name,
      "messaging.message.id": workflowId, // Workflow Id
      "messaging.destination.name": 'example', // Workflow Type
      //"messaging.message.body.size": messageBodySize, 
    },
    //forceTransaction: true
  }, async(span) => {
    const traceHeader = spanToTraceHeader(span);
    let baggageHeader = Sentry.spanToBaggageHeader(span);
    baggageHeader = baggageHeader ? baggageHeader : '';
    //const dynamicSamplingContext = getDynamicSamplingContextFromSpan(span);
    //let baggageHeader = dynamicSamplingContextToSentryBaggageHeader(dynamicSamplingContext);
    //baggageHeader = baggageHeader ? baggageHeader : '';

    const aExampleRequest:ExampleRequest = {
      name,
      sentryTrace: {
        traceHeader,
        baggageHeader,
      }
    };

    await client.workflow.start(example, {
      taskQueue,
      args: [aExampleRequest],
      workflowId: workflowId
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