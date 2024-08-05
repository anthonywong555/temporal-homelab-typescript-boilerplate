import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { getenv, env } from "../env";
import type { WorkerOptions } from "@temporalio/worker";

import { sentrySinks } from "./sinks";
import { SentryActivityInboundInterceptor } from "./interceptors/activites";

export const sentryDNS = getenv('SENTRY_DNS', '');

// Check to see Sentry is declared.
if(sentryDNS) {
  Sentry.init({
    dsn: sentryDNS,
    integrations: [
      nodeProfilingIntegration()
    ],
    // Add Tracing by setting tracesSampleRate
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
  
    // Set sampling rate for profiling
    // This is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });

  console.info('🤖: Sentry Online');
}

export function getSentryWorkerOptions(): Pick<WorkerOptions, 'sinks' | 'interceptors'> {
  return {
    sinks: {...sentrySinks()},
    interceptors: {
      activity: [(ctx) => {
        return {
          inbound: new SentryActivityInboundInterceptor(ctx)
        }
      }],
      ...(env != 'production' && {
        workflowModules: [require.resolve('./interceptors/workflows/index')],
      })
    }
  };
}