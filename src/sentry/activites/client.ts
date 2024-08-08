export default class SentryClient {
    constructor() {

    }

    startWorkflowSpan(traceHeader?: string, baggageHeader?: string) {
        if(traceHeader && baggageHeader) {
            // Start a new Span off the existing trasaction.

        } else {
            // Start a whole new Span and set it as a transaction.
            
        }
    }
}