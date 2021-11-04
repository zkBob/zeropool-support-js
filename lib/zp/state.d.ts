import { UserAccount } from "libzeropool-rs-wasm-bundler";
export declare class ZeroPoolState {
    denominator: bigint;
    privateAccount: UserAccount;
    static create(sk: Uint8Array, coinName: string, denominator: bigint): Promise<ZeroPoolState>;
    getTotalBalance(): string;
    getBalances(): [string, string, string];
}
