import type { ExecutionListItem } from '@aws-sdk/client-sfn';
import {
  ExecutionDoesNotExist,
  ListExecutionsCommand,
  SFNClient,
  StartExecutionCommand,
  StopExecutionCommand,
} from '@aws-sdk/client-sfn';

export type ResourceProperties = {
  readonly Timestamp: number;
  readonly StateMachineArn: string;
  readonly Expires: number;
};

const sfn = new SFNClient();

export const handler: AWSCDKAsyncCustomResource.OnEventHandler = async (event): Promise<undefined> => {
  if (event.RequestType !== 'Create' && event.RequestType !== 'Update') return;

  const props = event.ResourceProperties as unknown as ResourceProperties;
  const executions = await listRunningExecutions(props.StateMachineArn);
  await Promise.all(executions.map(stopExecution));
  await startExecution(props.StateMachineArn, props.Expires);
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
