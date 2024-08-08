import { SentryTrace } from "../../sentry/types";

export interface GreetRequest {
    name: string;
    sentryTrace?: SentryTrace;
}