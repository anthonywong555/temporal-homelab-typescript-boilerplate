import { sentrySinks, type SentrySinks } from '../../sentry/sinks';
import { proxyActivities, proxySinks, workflowInfo } from '@temporalio/workflow';
import type { ExampleRequest } from './types';
import type { GreetRequest } from '../../sharable-activites/example/types';
import type * as activities from '../../sharable-activites/example/activity';
import * as SentryActivites from '../../sentry/activites/activites';

const sinks = proxySinks<SentrySinks>();

const { greet } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    maximumAttempts: 3
  }
});

const { getSentryTracing } = proxyActivities<typeof SentryActivites>({
  startToCloseTimeout: '1 minute',
  retry: {
    maximumAttempts: 3
  }
})

export async function example(aRequest: ExampleRequest): Promise<string> {
  const {name, traceHeader, baggageHeader} = aRequest;
  const workflowId = workflowInfo().workflowId;

  const trace = await getSentryTracing(workflowId);

  const greets = [];
  for(let i = 0; i < 3; i++) {
    const aGreetRequest:GreetRequest = {
      ...aRequest
    }

    greets.push(greet(aGreetRequest));
  }
  const results = await Promise.all(greets);
  return results[0];
}