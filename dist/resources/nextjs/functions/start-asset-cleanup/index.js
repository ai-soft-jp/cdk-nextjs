"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sfn_1 = require("@aws-sdk/client-sfn");
const sfn = new client_sfn_1.SFNClient();
const handler = async (event) => {
    if (event.RequestType !== 'Create' && event.RequestType !== 'Update')
        return;
    const props = event.ResourceProperties;
    const executions = await listRunningExecutions(props.StateMachineArn);
    await Promise.all(executions.map(stopExecution));
    await startExecution(props.StateMachineArn, props.Expires);
};
exports.handler = handler;
async function listRunningExecutions(stateMachineArn) {
    const res = await sfn.send(new client_sfn_1.ListExecutionsCommand({ stateMachineArn, statusFilter: 'RUNNING' }));
    return res.executions || [];
}
async function startExecution(stateMachineArn, expires) {
    const input = { threshold: Date.now() - expires };
    await sfn.send(new client_sfn_1.StartExecutionCommand({ stateMachineArn, input: JSON.stringify(input) }));
}
async function stopExecution({ executionArn }) {
    try {
        await sfn.send(new client_sfn_1.StopExecutionCommand({ executionArn }));
    }
    catch (error) {
        if (error instanceof client_sfn_1.ExecutionDoesNotExist)
            return;
        throw error;
    }
}
//# sourceMappingURL=index.js.map