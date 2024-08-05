import { bundleWorkflowCode } from '@temporalio/worker';
import { writeFile } from 'fs/promises';
import path from 'path';
import { sentryDNS } from "../sentry/instrument";

async function bundle() {
  const { code } = await bundleWorkflowCode({
    workflowsPath: require.resolve('../workflows/index'),
    // Uncomment this line if you planning to not use Sentry
    workflowInterceptorModules: [require.resolve('../sentry/interceptors/workflows/index')]
  });

  console.log(`sentryDNS`, sentryDNS != null);

  const codePath = path.join(__dirname, '../workflow-bundle.js');

  await writeFile(codePath, code);
  console.log(`Bundle written to ${codePath}`);
}

bundle().catch((err) => {
  console.error(err);
  process.exit(1);
});