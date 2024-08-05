import { Connection, Client, ScheduleOverlapPolicy } from '@temporalio/client';
import { example } from './workflows/example/workflow';
import { customSchedule, type ScheduleRequest } from './workflows/schedules/index';
import { nanoid } from 'nanoid';
import { getConnectionOptions, namespace, taskQueue } from './env';

async function run() {
  console.log(`Hello`);
  const connection = await Connection.connect(await getConnectionOptions());

  const client = new Client({
    connection,
    namespace
  });

  const promises = [];
  const NUM_CALLS = 1;

  for (let i = 0; i < NUM_CALLS; i++) {
    promises.push(client.workflow.start(example, {
      taskQueue,
      args: ['Temporal'],
      workflowId: `workflow-${nanoid()}`
    }));
  }

  console.info(`Started ${NUM_CALLS} workflows`);

  const handles = await Promise.all(promises);

  console.info(`Done`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});