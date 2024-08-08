import { SentryTracing } from "../types";
import { workflowIdToSentryTracing } from "../sinks";

export async function getSentryTracing(workflowId: string): Promise<any>{
    console.info('getSentryTracing');
    console.info('workflowId', workflowId);
    console.info(`tracing`, workflowIdToSentryTracing.get(workflowId));
    return workflowIdToSentryTracing;
}

export async function startWorkflowSpan(): Promise<SentryTracing> {
    return {
        baggageHeader: '',
        traceHeader: ''
    };
}