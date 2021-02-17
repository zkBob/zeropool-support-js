import * as HDKey from 'hdkey';
import { CoinType } from './coins/coin-type';
export { HDKey };
export declare function preprocessMnemonic(mnemonic: string): string;
export declare function parseMnemonic(mnemonic: string, coin: CoinType, accountIdx: number): HDKey;
export declare function generateMnemonic(): string;
export declare function validateMnemonic(mnemonic: string): boolean;
