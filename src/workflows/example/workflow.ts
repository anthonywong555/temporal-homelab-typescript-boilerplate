//import { sentrySinks, type SentrySinks } from '../../sentry/sinks';
import { proxyActivities, proxySinks, workflowInfo } from '@temporalio/workflow';
import type { ExampleRequest } from './types';
import type { GreetRequest } from '../../sharable-activites/example/types';
import type * as activities from '../../sharable-activites/example/activity';
import type * as SentryActivities from '../../sentry/activites';
import { SentryTrace } from '../../sentry/types';
import { SentrySinks } from '../../sentry/sinks';


const { sentry } = proxySinks<SentrySinks>();

const { greet } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    maximumAttempts: 3
  }
});

const { startWorkflowSpan } = proxyActivities<typeof SentryActivities>({
  startToCloseTimeout: '1 minute',
  retry: {
    maximumAttempts: 3
  }
})

export async function example(aRequest: ExampleRequest): Promise<string> {
  const {name, sentryTrace} = aRequest;
  const workflowSentryTrace = sentryTrace ? await startWorkflowSpan(sentryTrace, workflowInfo()) : {
    traceHeader: '',
    baggageHeader: '',
    span: null
  };
  
  const greets = [];
  for(let i = 0; i < 3; i++) {
    const aGreetRequest:GreetRequest = {
      ...aRequest,
      sentryTrace: workflowSentryTrace
    }

    greets.push(greet(aGreetRequest));
  }
  const results = await Promise.all(greets);

  console.info('span', workflowSentryTrace.span);

  sentry.stopWorkflowSpan(workflowSentryTrace.span);
  return results[0];
}