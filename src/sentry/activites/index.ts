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
                return await Sentry.startSpan({
                    name: 'WorkflowExecutionStarted',
                    op: 'queue.process',
                    attributes: {
                        'messaging.message.id': workflowInfo.workflowId,
                        'messaging.destination.name': workflowInfo.workflowType,
                        'messaging.message.retry.count': workflowInfo.attempt
                    },
                }, async(span) => {
                    //parent.setStatus({code: 1, message: 'ok' });
                    const workflowTraceHeader = Sentry.spanToTraceHeader(span);
                    let workflowBaggageHeader = Sentry.spanToBaggageHeader(span);
                    //const dynamicSamplingContext = getDynamicSamplingContextFromSpan(span);
                    //let workflowBaggageHeader = dynamicSamplingContextToSentryBaggageHeader(dynamicSamplingContext);
                    workflowBaggageHeader = workflowBaggageHeader ? workflowBaggageHeader : '';
                    
                    console.info('Returning the object value');

                    return { traceHeader: workflowTraceHeader, baggageHeader: workflowBaggageHeader };
                });
            });
        }
    }
    
    console.info('else StartedWorkflowSpanHelper');
    // Create a new Span
    return await startWorkflowSpanHelper(workflowInfo, true);
}

async function startWorkflowSpanHelper(workflowInfo: WorkflowInfo, forceTransaction = false): Promise<SentryTrace> {
    console.log(`forceTransaction`, forceTransaction);
    return await Sentry.startSpanManual({
        name: 'queue_consumer',
        op: 'queue.process',
        attributes: {
            /*workflowId: workflowInfo.workflowId,
            runId: workflowInfo.runId,
            taskQueue: workflowInfo.taskQueue,
            namespace: workflowInfo.namespace,
            */
            'messaging.message.id': workflowInfo.workflowId,
            'messaging.destination.name': workflowInfo.workflowType,
            //'messaging.message.receive.latency': workflowInfo.startTime,
            'messaging.message.retry.count': workflowInfo.attempt
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