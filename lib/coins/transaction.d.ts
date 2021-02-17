export declare enum TxStatus {
    Completed = 0,
    Pending = 1,
    Error = 2
}
export declare class Transaction {
    hash: string;
    blockHash: string;
    status: TxStatus;
    amount: string;
    from: string;
    to: string;
    /** UNIX timestamp in seconds */
    timestamp: number;
}
export declare class TxFee {
    gas: string;
    gasPrice: string;
    fee: string;
}
