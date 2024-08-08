import { sentryDNS, getSentryWorkerOptions } from './sentry/instrument';

import {
  namespace,
  taskQueue,
  getConnectionOptions,
  getWorkflowOptions,
  getTelemetryOptions,
  getenv,
  env
} from "./env";

console.info(`🤖: Node_ENV = ${env}`);

import http from 'node:http';
import { NativeConnection, Runtime, Worker} from '@temporalio/worker';
import * as activities from './sharable-activites/index';
import { sentrySinks } from "./sentry/sinks";
import { SentryActivityInboundInterceptor } from "./sentry/interceptors/activites";
import { SentryTrace } from './sentry/types';
import * as sentryActivites from './sentry/activites';

async function withOptionalStatusServer(worker: Worker, port: number | undefined, fn: () => Promise<any>): Promise<void> {
  if (port == null) {
    await fn();
    return;
  }

  const server = await new Promise<http.Server>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.method !== 'GET') {
        res.writeHead(405, 'Method not allowed');
        res.end();
        return;
      }

      if (req.url !== '/') {
        res.writeHead(404, 'Not found');
        res.end();
        return;
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.write(JSON.stringify(worker.getStatus()));
      res.end();

      console.info(`Health Check ✅`);
    });
    server.listen(port, () => resolve(server));
    server.once('error', reject);
  });
  console.log('Status server listening on', server?.address());
  try {
    await fn();
  } finally {
    server.close();
  }
}

async function run() {
  try {
    console.info('🤖: Temporal Worker Coming Online...');

    const connectionOptions = await getConnectionOptions();
    const telemetryOptions = getTelemetryOptions();

    if(telemetryOptions) {
      Runtime.install(telemetryOptions);
    }

    const connection = await NativeConnection.connect(connectionOptions);
    const worker = await Worker.create({
      connection,
      namespace,
      taskQueue,
      activities: {...activities, ...sentryActivites},
      ...getWorkflowOptions(),
      ...getSentryWorkerOptions(),
    });

    const statusPort = getenv('TEMPORAL_WORKER_STATUS_HTTP_PORT', '');

    if(statusPort) {
      await withOptionalStatusServer(worker, parseInt(statusPort), async () => {
        try {
          console.info('🤖: Temporal Worker Online! Beep Boop Beep!');
          await worker.run();
        } finally {
          await connection.close();
        }
      });
    } else {
      console.info('🤖: Temporal Worker Online! Beep Boop Beep!');
      await worker.run();
      await connection.close();
    }
  } catch (e) {
    console.error('🤖: ERROR!', e);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});