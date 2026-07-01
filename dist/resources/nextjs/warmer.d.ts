import { Construct } from 'constructs';
import type { NextServer } from './server';
interface NextWarmerProps {
    readonly appPath: string;
    readonly server: NextServer;
    readonly concurrency: number;
}
export declare class NextWarmer extends Construct {
    constructor(scope: Construct, id: string, props: NextWarmerProps);
}
export {};
