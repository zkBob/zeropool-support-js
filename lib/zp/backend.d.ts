import { Output } from "libzeropool-rs-wasm-bundler";
import { ZeroPoolState } from "./state";
export declare abstract class ZeroPoolBackend {
    protected zpState: ZeroPoolState;
    constructor(state: ZeroPoolState);
    abstract transfer(privateKey: string, outs: Output[]): Promise<void>;
    abstract deposit(privateKey: string, amount: string): Promise<void>;
    abstract withdraw(privateKey: string, amount: string): Promise<void>;
}
