import type { SentryTrace } from "../../sentry/types";

export interface ExampleRequest {
    name: string;
    sentryTrace?: SentryTrace
}
