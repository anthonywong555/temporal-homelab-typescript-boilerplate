import * as Sentry from "@sentry/node";
import * as activity from '@temporalio/activity';
import { spanToTraceHeader, getDynamicSamplingContextFromSpan } from '@sentry/core';
import { dynamicSamplingContextToSentryBaggageHeader } from '@sentry/utils';
import type { SentryTrace } from "../types";
import type { WorkflowInfo } from "@temporalio/workflow";

export async function startWorkflowSpan(aSentryTrace: SentryTrace, workflowInfo: WorkflowInfo): Promise<SentryTrace> {
    if(aSentryTrace) {
        const { traceHeader = '', baggageHeader = '' } = aSentryTrace;
        if(traceHeader && baggageHeader) {
            // Continue Span
            return await Sentry.continueTrace({
                sentryTrace: traceHeader,
                baggage: baggageHeader
            }, async () => {
                return await startWorkflowSpanHelper(workflowInfo);
            });
        }
    }
    
    // Create a new Span
    return await startWorkflowSpanHelper(workflowInfo, true);
}

async function startWorkflowSpanHelper(workflowInfo: WorkflowInfo, forceTransaction = false): Promise<SentryTrace> {
    return await Sentry.startSpanManual({
        name: workflowInfo.workflowType,
        op: 'workflow.started',
        attributes: {
            workflowId: workflowInfo.workflowId,
            runId: workflowInfo.runId,
            taskQueue: workflowInfo.taskQueue,
            namespace: workflowInfo.namespace,
        },
        forceTransaction
    }, async(span) => {
        const workflowTraceHeader = spanToTraceHeader(span);
        const dynamicSamplingContext = getDynamicSamplingContextFromSpan(span);
        let workflowBaggageHeader = dynamicSamplingContextToSentryBaggageHeader(dynamicSamplingContext);
        workflowBaggageHeader = workflowBaggageHeader ? workflowBaggageHeader : '';

        return { traceHeader: workflowTraceHeader, baggageHeader: workflowBaggageHeader, span };
    });
}