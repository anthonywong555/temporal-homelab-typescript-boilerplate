import * as activity from '@temporalio/activity';
import type { GreetRequest } from "./types";

const UPPER_BOUND_IN_MILLIS:number = 2000;

async function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function greet(aGreetRequest: GreetRequest): Promise<string> {
  const context = activity.Context.current();
  console.log(context.info.activityId);
  //console.log(workflowId);
  const { name } = aGreetRequest;
  const sleepTime = Math.round(Math.random() * UPPER_BOUND_IN_MILLIS);
  console.info(`sleepTime: ${sleepTime}`);
  await timeout(sleepTime);
  console.info(`Sleep Elasped`);
  return `Hello, ${name}!`;
}