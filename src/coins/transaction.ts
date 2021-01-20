export enum TxStatus {
  Completed,
  Pending,
  Error,
}

export class Transaction {
  hash: string;
  blockHash: string;
  status: TxStatus;
  amount: string;
  from: string;
  to: string;
  /** UNIX timestamp in seconds */
  timestamp: number;
}
