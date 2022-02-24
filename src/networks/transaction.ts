export enum TxStatus {
  Completed,
  Pending,
  Error,
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
  gas: string;
  gasPrice: string;
  fee: string;
}