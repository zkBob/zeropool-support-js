import { Transaction, TxStatus } from '../transaction';
import { Transaction as NativeTx } from 'web3-core';
export declare function convertTransaction(tx: NativeTx, timestamp: number, customStatus?: TxStatus): Transaction;
