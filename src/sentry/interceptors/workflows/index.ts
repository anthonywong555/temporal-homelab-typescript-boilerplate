import { SentrySinks } from "../../sinks";
import type { Next, WorkflowInboundCallsInterceptor, WorkflowOutboundCallsInterceptor, WorkflowInterceptors } from "@temporalio/workflow";
import { proxySinks, workflowInfo } from "@temporalio/workflow";
import type { ActivityInput, WorkflowExecuteInput } from "@temporalio/workflow/lib/interceptors";
import type { SentryTrace } from "../../types";

const { sentry } = proxySinks<SentrySinks>();

class SentryWorkflowInboundInterceptor
  implements WorkflowInboundCallsInterceptor
{
  constructor(public readonly workflowType: string) {}

  execute = async (
    input: WorkflowExecuteInput,
    next: Next<WorkflowInboundCallsInterceptor, "execute">,
  ): Promise<unknown> => {
    try {
      if(input.args.length === 0) {
        return await next(input);
      }

      const sentryTrace = input.args[0] as SentryTrace;

      if(!sentryTrace) {
        return await next(input);
      }

      sentry.continueTrace(sentryTrace);
      return await next(input);
    } catch (err) {
      sentry.captureException(err);
      throw err;
    } finally {

    }
  };
}

class SentryWorkflowOutboundInterceptor implements WorkflowOutboundCallsInterceptor {
  constructor(public readonly workflowType: string) {}

  scheduleActivity = async (input: ActivityInput, next: Next<WorkflowOutboundCallsInterceptor, "scheduleActivity">,): Promise<unknown> => {
    const { activityType } = input;

    if(activityType === 'startWorkflowSpan' || input.args.length === 0) {
      return next(input);
    } else {
      const sentryTrace = input.args[0] as SentryTrace;

      if(!sentryTrace) {
        return next(input);
      } else {
        sentry.startActivityQueueSpan(sentryTrace, input);
        return next(input);
      }
    }    

    return next(input);
  }
}

export const interceptors = (): WorkflowInterceptors => ({
  //inbound: [new SentryWorkflowInboundInterceptor(workflowInfo().workflowType)],
  //inbound: [],
  //outbound: [new SentryWorkflowOutboundInterceptor(workflowInfo().workflowType)]
});