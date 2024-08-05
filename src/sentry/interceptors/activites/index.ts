import * as Sentry from "@sentry/node";
import type { Context } from "@temporalio/activity";
import type { ActivityInboundCallsInterceptor, ActivityOutboundCallsInterceptor } from "@temporalio/worker";
import type { ActivityExecuteInput, GetLogAttributesInput } from "@temporalio/worker/src/interceptors";
import type { Next } from "@temporalio/workflow";

import { workflowIdToSentrySpans, type SentrySinks } from '../../sinks/index';

export class SentryActivityInboundInterceptor implements ActivityInboundCallsInterceptor {
  constructor(public readonly context: Context) {
    this.context = context;
  }

  execute = async (input: ActivityExecuteInput, next: Next<ActivityInboundCallsInterceptor, "execute">): Promise<unknown> => {
    const workflowSpan = workflowIdToSentrySpans.get(this?.context?.info?.workflowExecution?.workflowId);

    if(workflowSpan) {
      await Sentry.withActiveSpan(workflowSpan, async () => {
        await Sentry.startSpanManual(
          {
            name: this.context.info.activityType,
            op: 'Activity'
          },
          async (span) => {
            try {
              console.info(`Sentry: Activity Span Started on ${this.context.info.activityType}`);
              return await next(input);
            } catch (err) {
              console.error(`Failure when starting an activity span`, err);
              throw err;
            } finally {
              if(span) {
                span.end();
                console.info(`Sentry: Activity Span Ended on ${this.context.info.activityType}`);
              }
            }
          },
        );
      });
    } else {
      console.error(`Missing Workflow Span`);
      return await next(input);
    }
  }
}