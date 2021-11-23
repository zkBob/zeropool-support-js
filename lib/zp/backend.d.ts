import { Output } from "../libzeropool-rs";
import { ZeroPoolState } from './state';
export declare abstract class ZeroPoolBackend {
    protected zpState: ZeroPoolState;
    protected worker: any;
    constructor(state: ZeroPoolState, worker: any);
    abstract transfer(privateKey: string, outs: Output[], fee?: string): Promise<void>;
    abstract deposit(privateKey: string, amount: string, fee?: string): Promise<void>;
    abstract withdraw(privateKey: string, amount: string, fee?: string): Promise<void>;
}
