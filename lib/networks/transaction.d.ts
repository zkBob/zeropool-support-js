export declare enum TxStatus {
    Completed = 0,
    Pending = 1,
    Error = 2
}
export interface Transaction {
    hash: string;
    blockHash: string;
    status: TxStatus;
    amount: string;
    from: string;
    to: string;
    /** UNIX timestamp in seconds */
    timestamp: number;
}
export interface TxFee {
    gas: bigint;
    gasPrice: bigint;
    fee: string;
}
