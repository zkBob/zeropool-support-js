import { Transaction } from './transaction';
import { NetworkType } from './network-type';
export interface TxStorage {
    add(coin: NetworkType, address: string, tx: Transaction): any;
    list(coin: NetworkType, address: string): Transaction[];
}
export declare class LocalTxStorage implements TxStorage {
    private prefix;
    constructor(prefix: string);
    add(coin: NetworkType, address: string, tx: Transaction): void;
    list(coin: NetworkType, address: string): Transaction[];
}
