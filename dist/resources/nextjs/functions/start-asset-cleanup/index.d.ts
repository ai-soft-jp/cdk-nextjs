export type ResourceProperties = {
    readonly Timestamp: number;
    readonly StateMachineArn: string;
    readonly Expires: number;
};
export declare const handler: AWSCDKAsyncCustomResource.OnEventHandler;
