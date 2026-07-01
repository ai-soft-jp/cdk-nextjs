import type { ExecutionListItem } from '@aws-sdk/client-sfn';
import {
  ExecutionDoesNotExist,
  ListExecutionsCommand,
  SFNClient,
  StartExecutionCommand,
  StopExecutionCommand,
} from '@aws-sdk/client-sfn';
import type { Handler } from 'aws-lambda';

export type Env = {
  readonly STATE_MACHINE_ARN: string;
  readonly EXPIRES: string;
};

const env = process.env as Env;
const sfn = new SFNClient();

export const handler: Handler = async () => {
  const executions = await listRunningExecutions(env.STATE_MACHINE_ARN);
  await Promise.all(executions.map(stopExecution));
  await startExecution(env.STATE_MACHINE_ARN, parseInt(env.EXPIRES, 10));
};

async function listRunningExecutions(stateMachineArn: string) {
  const res = await sfn.send(new ListExecutionsCommand({ stateMachineArn, statusFilter: 'RUNNING' }));
  return res.executions || [];
}

async function startExecution(stateMachineArn: string, expires: number) {
  const input = { threshold: Date.now() - expires };
  await sfn.send(new StartExecutionCommand({ stateMachineArn, input: JSON.stringify(input) }));
}

async function stopExecution({ executionArn }: ExecutionListItem) {
  try {
    await sfn.send(new StopExecutionCommand({ executionArn }));
  } catch (error) {
    if (error instanceof ExecutionDoesNotExist) return;
    throw error;
  }
}
