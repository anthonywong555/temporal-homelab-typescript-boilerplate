import { SentrySinks } from "../../sinks";
import type { ActivityInput, Next, WorkflowInboundCallsInterceptor, WorkflowOutboundCallsInterceptor, WorkflowInterceptors } from "@temporalio/workflow";
import { proxySinks, workflowInfo } from "@temporalio/workflow";
import type { WorkflowExecuteInput } from "@temporalio/workflow/lib/interceptors";

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
      const aRequest = input.args[0];

      // A trace and baggage has been provided.
      const { traceHeader = '', baggageHeader = '' } = aRequest;
      if(traceHeader && baggageHeader) {
        await sentry.continueTrace({traceHeader, baggageHeader});
        return await next(input);
      } else {
        // Start a new space with a trace.
        await sentry.startWorkflowSpan();
        return await next(input);
      }
    } catch (err) {
      sentry.captureException(err);
      throw err;
    } finally {
      await sentry.stopWorkflowSpan();
    }
  };
}

export const interceptors = (): WorkflowInterceptors => ({
  inbound: [new SentryWorkflowInboundInterceptor(workflowInfo().workflowType)],
});