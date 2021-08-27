export interface RelayerInfo {
    numTransactions: number;
    numFinalTransactions: number;
    time: number;
}
export declare class RelayerAPI {
    url: URL;
    constructor(url: URL);
    fetchLeaves(offset: BigInt, limit?: BigInt): Promise<Int8Array[]>;
    sendTransaction(data: string): Promise<void>;
    info(): Promise<RelayerInfo>;
}
