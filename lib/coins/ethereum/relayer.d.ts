export interface RelayerInfo {
    numTransactions: number;
    numFinalTransactions: number;
    time: number;
}
export declare class RelayerAPI {
    url: URL;
    constructor(url: URL);
    fetchLeaves(offset: BigInt, limit?: number): Promise<string[]>;
    sendTransaction(proof: string, memo: string): Promise<void>;
    info(): Promise<RelayerInfo>;
}
