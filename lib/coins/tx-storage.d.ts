import { Transaction } from './transaction';
import { CoinType } from './coin-type';
export interface TxStorage {
    add(coin: CoinType, address: string, tx: Transaction): any;
    list(coin: CoinType, address: string): Transaction[];
}
export declare class LocalTxStorage implements TxStorage {
    private prefix;
    constructor(prefix: string);
    add(coin: CoinType, address: string, tx: Transaction): void;
    list(coin: CoinType, address: string): Transaction[];
}
