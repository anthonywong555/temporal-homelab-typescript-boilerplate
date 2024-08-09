import * as Sentry from "@sentry/node";
import * as activity from '@temporalio/activity';
import type { SentryTrace } from "../types";
import type { WorkflowInfo } from "@temporalio/workflow";

export async function startWorkflowSpan(aSentryTrace: SentryTrace, workflowInfo: WorkflowInfo): Promise<SentryTrace> {
    if(aSentryTrace) {
        const { traceHeader = '', baggageHeader = '' } = aSentryTrace;
        if(traceHeader && baggageHeader) {
            // Continue Span
            console.log(`Continue Span`);
            return await Sentry.continueTrace({
                sentryTrace: traceHeader,
                baggage: baggageHeader
            }, async () => {
                console.log(`Start a new span`);
                return await startWorkflowSpanHelper(workflowInfo, false);
            });
        }
    }
    
    // Create a new Span
    return await startWorkflowSpanHelper(workflowInfo, true);
}

async function startWorkflowSpanHelper(workflowInfo: WorkflowInfo, forceTransaction = false): Promise<SentryTrace> {
    console.log(`forceTransaction`, forceTransaction);
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
        const workflowTraceHeader = Sentry.spanToTraceHeader(span);
        let workflowBaggageHeader = Sentry.spanToBaggageHeader(span);
        //const dynamicSamplingContext = getDynamicSamplingContextFromSpan(span);
        //let workflowBaggageHeader = dynamicSamplingContextToSentryBaggageHeader(dynamicSamplingContext);
        workflowBaggageHeader = workflowBaggageHeader ? workflowBaggageHeader : '';

        return { traceHeader: workflowTraceHeader, baggageHeader: workflowBaggageHeader, span };
    });
}