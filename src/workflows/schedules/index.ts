import { proxyActivities } from '@temporalio/workflow';
import { continueAsNew, defineSignal, defineQuery, setHandler, condition, log } from '@temporalio/workflow';
import * as activities from '../../sharable-activites/example/activity';
import * as scheduleWorkflowActivities from './activity/index';

console.log('activities', activities);
console.log('scheduleWorkflowActivities', scheduleWorkflowActivities);

const { greet } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    maximumAttempts: 3
  }
});

const { calculateNextExecution } = proxyActivities<typeof scheduleWorkflowActivities>({
  startToCloseTimeout: '1 minute',
  retry: {
    maximumAttempts: 3
  }
})

export const updateSchedule = defineSignal<[ScheduleRequest]>('updateSchedule');

export interface ScheduleRequest {
  startDateTime: string;
  endDateTime: string;
  interval: string;

}

export interface ScheduleResponse {
  delay: number | null;
  shouldCAN: boolean;
}

export async function customSchedule(name: string, schedule: ScheduleRequest): Promise<void> {
  // Set a Signal Handler
  let isUpdateSchedule = false;

  setHandler(updateSchedule, (newSchedule: ScheduleRequest) => {
    schedule = newSchedule;
    isUpdateSchedule = true; 
  });
  
  const scheduleResponse = await calculateNextExecution(schedule);
  console.log('scheduleResponse', scheduleResponse);
  const {delay, shouldCAN} = scheduleResponse;

  if(delay) {
    const {delay, shouldCAN} = scheduleResponse;
    if(await condition(() => isUpdateSchedule, delay)) {
      // A new Duration has been set.
    } else {
      // Do the actual work.
      const result = await greet(name);
      console.log(result);
    }
  
    if(shouldCAN) {
      await continueAsNew<typeof customSchedule>('Hello', schedule);
    }
  } else {
    // Shouldn't run
  }
}