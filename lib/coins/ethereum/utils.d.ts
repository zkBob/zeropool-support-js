import { Transaction, TxStatus } from '../transaction';
import { Transaction as NativeTx } from 'web3-core';
export declare function convertTransaction(tx: NativeTx, timestamp: number, customStatus?: TxStatus): Transaction;
export declare function toCompactSignature(signature: string): string;
export declare function toCanonicalSignature(signature: string): string;
