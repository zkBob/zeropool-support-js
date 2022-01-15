import { Transaction as NativeTx } from 'web3-core';
import { Constants } from "../../libzeropool-rs";
import { Transaction, TxStatus } from '../transaction';
export declare const CONSTANTS: Constants;
export declare function convertTransaction(tx: NativeTx, timestamp: number, customStatus?: TxStatus): Transaction;
export declare function toCompactSignature(signature: string): string;
export declare function toCanonicalSignature(signature: string): string;
