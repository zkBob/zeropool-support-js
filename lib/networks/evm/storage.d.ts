import { Transaction } from "../transaction";
export interface TxStorage {
    add(address: string, tx: Transaction): any;
    list(address: string): Transaction[];
}
export declare class LocalTxStorage implements TxStorage {
    private prefix;
    constructor(prefix: string);
    add(address: string, tx: Transaction): void;
    list(address: string): Transaction[];
}
