import { proxyActivities, proxyLocalActivities, proxySinks, workflowInfo } from '@temporalio/workflow';
import type { ExampleRequest } from './types';
import type { GreetRequest } from '../../sharable-activites/example/types';
import type * as activities from '../../sharable-activites/example/activity';

const { greet } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    maximumAttempts: 3
  }
});

export async function example(aRequest: ExampleRequest): Promise<string> {
  const {name, sentryTrace} = aRequest;
  
  const greets = [];
  for(let i = 0; i < 3; i++) {
    const aGreetRequest:GreetRequest = {
      ...aRequest
    }

    greets.push(greet(aGreetRequest));
  }
  const results = await Promise.all(greets);

  await greet({
    name: "Howdy"
  });
  
  return results[0];
}