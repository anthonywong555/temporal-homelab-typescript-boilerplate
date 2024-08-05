import * as Sentry from "@sentry/node";
import type { InjectedSinks } from "@temporalio/worker";
import { workflowInfo, type Sinks, type WorkflowInfo } from "@temporalio/workflow";

export interface SentrySinks extends Sinks {
  sentry: {
    startWorkflowSpan(): void;
    stopWorkflowSpan(): void;
    captureMessage: typeof Sentry.captureMessage;
    captureException: typeof Sentry.captureException;
  };
}

export const workflowIdToSentrySpans = new Map<string, Sentry.Span>();

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
              }
            }, async(span) => {
              console.log(`Sentry: Workflow Span Started on ${workflowInfo.workflowId}`);
              workflowIdToSentrySpans.set(workflowInfo.workflowId, span);
            })
          })
        },
      callDuringReplay: false
    },
    stopWorkflowSpan: {
      fn: async(workflowInfo, ...args) => {
        const span = workflowIdToSentrySpans.get(workflowInfo.workflowId);
        
        if(span) {
          span.end();
          console.log(`Sentry: Workflow Span Ended on ${workflowInfo.workflowId}`);
        }
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