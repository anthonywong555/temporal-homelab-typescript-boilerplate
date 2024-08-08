export interface SentryTrace {
    traceHeader: string;
    baggageHeader: string;
    span?: Sentry.Span
}