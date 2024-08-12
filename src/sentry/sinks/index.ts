import * as Sentry from "@sentry/node";
import { spanToTraceHeader, getDynamicSamplingContextFromSpan } from '@sentry/core';
import { dynamicSamplingContextToSentryBaggageHeader } from '@sentry/utils';
import type { InjectedSinks } from "@temporalio/worker";
import { ActivityInput, workflowInfo, type Sinks, type WorkflowInfo } from "@temporalio/workflow";
import type { SentryTrace } from "../types";

export interface SentrySinks extends Sinks {
  sentry: {
    continueTrace(span: SentryTrace): void;
    startWorkflowSpan(): void;
    //stopWorkflowSpan(): void;
    stopWorkflowSpan(span: SentryTrace): void;
    startActivityQueueSpan(span: SentryTrace, activityInput: ActivityInput): void;
    captureMessage: typeof Sentry.captureMessage;
    captureException: typeof Sentry.captureException;
  };
}

export const workflowIdToSentrySpans = new Map<string, Sentry.Span>();
export const workflowIdToSentryTracing = new Map<string, SentryTrace>();

const setTemporalScope = (scope: Sentry.Scope, workflowInfo: WorkflowInfo) => {
  scope.setTags({
    workflow: workflowInfo.workflowType,
    workflowNamespace: workflowInfo.namespace,
    queue: workflowInfo.taskQueue,
    workflowId: workflowInfo.workflowId
  });
  scope.setExtras({
    workflowId: workflowInfo.workflowId,
    runId: workflowInfo.runId,
    historyLength: workflowInfo.historyLength,
    firstExecutionRunId: workflowInfo.firstExecutionRunId,
    continuedFromExecutionRunId: workflowInfo.continuedFromExecutionRunId,
    startTime: workflowInfo.startTime,
    runStartTime: workflowInfo.runStartTime,
    executionTimeout: workflowInfo.executionTimeoutMs,
    executionExpirationTime: workflowInfo.executionExpirationTime,
    runTimeout: workflowInfo.runTimeoutMs,
    taskTimeout: workflowInfo.taskTimeoutMs,
    attempt: workflowInfo.attempt,
    cronSchedule: workflowInfo.cronSchedule,
    cronScheduleToScheduleInterval: workflowInfo.cronScheduleToScheduleInterval,
    ...workflowInfo.memo,
  });
};

export const sentrySinks = (): InjectedSinks<SentrySinks> => ({
  sentry: {
    startActivityQueueSpan: {
      fn: async(workflowInfo, ...args) => {
        if(args.length > 0) {
          const sentryTrace: SentryTrace = args[0];
          const activityInput: ActivityInput = args[1];

          const {traceHeader, baggageHeader} = sentryTrace;

          await Sentry.continueTrace({
            sentryTrace: traceHeader,
            baggage: baggageHeader
          }, async () => {
            return await Sentry.startSpan({
              name: 'workflow_worker_producer'
            }, async (parent) => {
              return await Sentry.startSpan(
                {
                  name: "ActivityTaskScheduled",
                  op: "queue.publish",
                  attributes: {
                    "messaging.message.id": `${activityInput.seq}`,
                    "messaging.destination.name": activityInput.activityType,
                    //"messaging.message.body.size": messageBodySize,
                  },
                }, async (span) => {
                  console.info('Queue Producer Activity');
                  //parent.setStatus({code: 1, message: 'ok'});
                });
            });
          })
          }
        }
      },

    continueTrace: {
      fn: async(workflowInfo, ...args: SentryTrace[]) => {

        const sentryTrace:SentryTrace = args[0] ? args[0] : {
          traceHeader: '',
          baggageHeader: '',
        };

        const {traceHeader, baggageHeader} = sentryTrace;
        
        if(traceHeader && baggageHeader) {
          await Sentry.continueTrace({
            sentryTrace: traceHeader,
            baggage: baggageHeader
          }, async () => {
            return await Sentry.startSpan({
              name: 'workflow_worker_consumer'
            }, async (parent) => {

            });
            /*
            await Sentry.startSpan({
              name: workflowInfo.workflowType,
              op: 'workflow.started',
              attributes: {
                runId: workflowInfo.runId,
                taskQueue: workflowInfo.taskQueue,
                namespace: workflowInfo.namespace,
                workflowId: workflowInfo.workflowId
              }
            }, async(span) => {
              console.log(`Sentry: Workflow Span Started on ${workflowInfo.workflowId} off the traceHeader ${traceHeader}`);
              //workflowIdToSentrySpans.set(workflowInfo.workflowId, span);
              const workflowTraceHeader = spanToTraceHeader(span);
              const dynamicSamplingContext = getDynamicSamplingContextFromSpan(span);
              let workflowBaggageHeader = dynamicSamplingContextToSentryBaggageHeader(dynamicSamplingContext);
              workflowBaggageHeader = workflowBaggageHeader ? workflowBaggageHeader : '';
            });
            */
          });
        }
      },
      callDuringReplay: true
    },
    startWorkflowSpan: {
      fn: async (workflowInfo, ...args) => {
          await Sentry.withScope(async (scope) => {
            setTemporalScope(scope, workflowInfo);
            await Sentry.startSpanManual({
              name: workflowInfo.workflowType,
              op: 'Workflow',
              attributes: {
                runId: workflowInfo.runId,
                taskQueue: workflowInfo.taskQueue,
                namespace: workflowInfo.namespace,
                workflowId: workflowInfo.workflowId
              },
              forceTransaction: true
            }, async(span) => {
              console.log(`Sentry: Workflow Span Started on ${workflowInfo.workflowId} without a Trace Header.`);
              workflowIdToSentrySpans.set(workflowInfo.workflowId, span);
            })
          })
          
        },
      callDuringReplay: false
    },
    stopWorkflowSpan: {
      fn: async(workflowInfo, ...args) => {
        /*
        const sentryTrace = args[0];
        const {traceHeader, baggageHeader} = sentryTrace;

        if(traceHeader && baggageHeader) {
          console.log('traceHeader', sentryTrace.traceHeader);
          console.log('baggageHeader', sentryTrace.baggageHeader);
          // End Span
          await Sentry.continueTrace({
            sentryTrace: traceHeader,
            baggage: baggageHeader
          }, async () => {
            return await Sentry.startSpan({
              name: 'workflow_worker_consumer'
            }, async (parent) => {
              parent.setStatus({code: 1, message: 'ok'});
              console.info('workflow_worker_consumer ended');
            } )
          });
        }
          */
      },
      callDuringReplay: false
    },
    captureMessage: {
      fn: (workflowInfo, ...args) =>
        Sentry.withScope((scope) => {
          setTemporalScope(scope, workflowInfo);
          Sentry.captureMessage(...args);
        }),
      callDuringReplay: false,
    },
    captureException: {
      fn: (workflowInfo, ...args) =>
        Sentry.withScope((scope) => {
          setTemporalScope(scope, workflowInfo);
          Sentry.captureException(...args);
        }),
      callDuringReplay: false,
    },
  },
});