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
    //console.(`Activityinput`, input);
    // Check to see if there's any traceHeader && baggageHeader
    const activityRequest:any = input.args[0];

    if(!activityRequest) {
      return await(input);
    }

    if(activityRequest) {
      const {traceHeader = '', baggageHeader = ''} = activityRequest;

      if(!traceHeader || !baggageHeader) {
        return await (input);
      }

      // Picking up the last trace
      await Sentry.continueTrace({
        sentryTrace: traceHeader,
        baggage: baggageHeader
      }, async () => {
        // Starting a Sentry Activity Span
        await Sentry.startSpanManual({
          name: this.context.info.activityType,
          op: 'activity.started',
          attributes: {
            activityId: this.context.info.activityId,
            attempt: this.context.info.attempt,
            startToCloseTimeoutMs: this.context.info.startToCloseTimeoutMs,
            taskQueue: this.context.info.taskQueue
          }
        }, async(span) => {
          try {
            console.info(`Sentry: Activity Span Started on ${this.context.info.activityType} off of ${traceHeader}`);
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
        });
      });
    }

    /*
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
    */
  }
}