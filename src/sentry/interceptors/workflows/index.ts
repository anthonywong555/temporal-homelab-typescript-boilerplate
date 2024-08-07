import type { SentrySinks } from "../../sinks";
import type { Next, WorkflowInboundCallsInterceptor, WorkflowInterceptors } from "@temporalio/workflow";
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
      console.log('input', input);
      await sentry.startWorkflowSpan();
      return await next(input);
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