import { Coin } from './coins/coin';
import { CoinType } from './coins/coin-type';
import { Config } from './config';
export declare type AccountIndex = number;
export declare class HDWallet {
    seed: string;
    private coins;
    private config;
    constructor(seed: string, config: Config, coins?: {
        [key in CoinType]?: AccountIndex[];
    });
    getRegularAddress(coinType: CoinType, account: number): string | undefined;
    getRegularPrivateKey(coinType: CoinType, account: number): string | undefined;
    getBalances(): Promise<{
        [key in CoinType]?: string;
    }>;
    enableCoin(coin: CoinType, accounts: number[]): void;
    disableCoin(coin: CoinType): void;
    getCoin(coinType: CoinType, account: number): Coin | undefined;
}
