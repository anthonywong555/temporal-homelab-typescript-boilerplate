import moment from 'moment-timezone';
import type { ScheduleRequest, ScheduleResponse } from "..";


export async function calculateNextExecution(schedule: ScheduleRequest): Promise<ScheduleResponse> {
  const delay = await getNextExecutionTime(schedule);

  return {
    delay,
    shouldCAN: delay != null
  }
}

function parseInterval(interval: string) {
  const [value, unit] = interval.split(' ');
  const valueInMs = parseInt(value, 10);

  switch (unit) {
      case 'second':
      case 'seconds':
          return valueInMs * 1000;
      case 'minute':
      case 'minutes':
          return valueInMs * 60 * 1000;
      case 'hour':
      case 'hours':
          return valueInMs * 60 * 60 * 1000;
      default:
          throw new Error('Unsupported interval unit');
  }
}

function getNextExecutionTime(schedule: ScheduleRequest) {
  const {startDateTime, endDateTime, interval} = schedule;
  const timeZone = 'America/New_York';
  const start = moment.tz(startDateTime, 'MMMM D, h:mm A z', timeZone);
  const end = moment.tz(endDateTime, 'MMMM D, h:mm A z', timeZone);
  const intervalMs = parseInterval(interval);

  const now = moment.tz(timeZone);
  if (now.isBefore(start)) {
      return start.diff(now);
  }

  const timeSinceStart = now.diff(start);
  const nextExecutionInMs = intervalMs - (timeSinceStart % intervalMs);
  const nextExecution = now.add(nextExecutionInMs, 'milliseconds');

  if (nextExecution.isAfter(end)) {
      return null;
  }

  return nextExecutionInMs;
}