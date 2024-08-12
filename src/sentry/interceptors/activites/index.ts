import * as Sentry from "@sentry/node";
import { activityInfo, type Context } from "@temporalio/activity";
import type { ActivityInboundCallsInterceptor } from "@temporalio/worker";
import type { ActivityExecuteInput } from "@temporalio/worker/src/interceptors";
import type { Next } from "@temporalio/workflow";
import type { SentryTrace } from "../../types";

export class SentryActivityInboundInterceptor implements ActivityInboundCallsInterceptor {
  constructor(public readonly context: Context) {
    this.context = context;
  }

  execute = async (input: ActivityExecuteInput, next: Next<ActivityInboundCallsInterceptor, "execute">): Promise<unknown> => {
    const activityRequest:any = input.args[0];

    if(!activityRequest || !activityRequest.sentryTrace) {
      return await next(input);
    }

    const sentryTrace:SentryTrace = activityRequest.sentryTrace;
    const { baggageHeader, traceHeader } = sentryTrace;
    const workflowSpan = sentryTrace.span;


    if(!traceHeader || !baggageHeader) {
      return await next(input);
    }

    console.info(`Continue the Workflow Trace`);
    return await Sentry.continueTrace({
      sentryTrace: traceHeader,
      baggage: baggageHeader
    }, async () => {
      return await Sentry.startSpan({
        name: 'ActivityTaskStarted'
      }, async (parent) => {
        return await Sentry.startSpan({
          name: 'ActivityTaskStarted',
          op: 'queue.process',
          attributes: {
            'messaging.message.id': `${this.context.info.activityId}`,
            'messaging.destination.name': this.context.info.activityType,
            //'messaging.message.body.size': message.messageBodySize,
            //'messaging.message.receive.latency': latency,
            'messaging.message.retry.count': this.context.info.attempt,
            //activityId: this.context.info.activityId,
            //attempt: this.context.info.attempt,
            //startToCloseTimeoutMs: this.context.info.startToCloseTimeoutMs,
            //taskQueue: this.context.info.taskQueue
          },
          //parentSpan: workflowSpan
        }, async(span) => {
          try {
            console.info(`Sentry: Activity Span Started on ${this.context.info.activityType} off of ${traceHeader}`);
            const result =  await next(input);
            span.end();
            //parent.setStatus({code: 1, message: 'ok'});
            return result;
          } catch (err) {
            console.error(`Failure when starting an activity span`, err);
            throw err;
          }
        });
      })
    })
  }
}