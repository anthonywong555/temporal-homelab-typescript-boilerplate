import { sentrySinks, type SentrySinks } from '../../sentry/sinks';
import { proxyActivities, proxySinks, workflowInfo } from '@temporalio/workflow';
import type * as activities from '../../sharable-activites/example/activity';

const sinks = proxySinks<SentrySinks>();

const { greet } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    maximumAttempts: 3
  }
});

export async function example(name: string): Promise<string> {
  //sinks.sentry.startWorkflowSpan();
  const greets = [];
  for(let i = 0; i < 3; i++) {
    greets.push(greet(name));
  }
  await Promise.all(greets);
  const result = await greet(name);
  //sinks.sentry.stopWorkflowSpan();
  return result;
}