const UPPER_BOUND_IN_MILLIS:number = 2000;

async function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function greet(name: string): Promise<string> {
  const sleepTime = Math.round(Math.random() * UPPER_BOUND_IN_MILLIS);
  console.info(`sleepTime: ${sleepTime}`);
  await timeout(sleepTime);
  console.info(`Sleep Elasped`);
  return `Hello, ${name}!`;
}