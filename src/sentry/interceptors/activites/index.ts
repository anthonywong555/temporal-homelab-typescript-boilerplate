import * as Sentry from "@sentry/node";
import type { Context } from "@temporalio/activity";
import type { ActivityInboundCallsInterceptor } from "@temporalio/worker";
import type { ActivityExecuteInput } from "@temporalio/worker/src/interceptors";
import type { Next } from "@temporalio/workflow";

export class SentryActivityInboundInterceptor implements ActivityInboundCallsInterceptor {
  constructor(public readonly context: Context) {
    this.context = context;
  }

  execute = async (input: ActivityExecuteInput, next: Next<ActivityInboundCallsInterceptor, "execute">): Promise<unknown> => {
    return await next(input);
  }
}