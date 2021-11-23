import { Output } from '@/libzeropool-rs';
import { ZeroPoolState } from './state';

// TODO: Don't use private keys directly

export abstract class ZeroPoolBackend {
    protected zpState: ZeroPoolState;
    protected worker: any;

    constructor(state: ZeroPoolState, worker: any) {
        this.zpState = state;
        this.worker = worker;
    }

    abstract transfer(privateKey: string, outs: Output[], fee?: string): Promise<void>;
    abstract deposit(privateKey: string, amount: string, fee?: string): Promise<void>;
    abstract withdraw(privateKey: string, amount: string, fee?: string): Promise<void>;
}
