import { Coin, Balance } from './coins/coin';
import { CoinType } from './coins/coin-type';
import { Config } from './config';
export declare class HDWallet {
    seed: string;
    private coins;
    private config;
    constructor(seed: string, config: Config);
    init(coinTypes: CoinType[]): Promise<void>;
    getRegularAddress(coinType: CoinType, account: number): string | undefined;
    getRegularPrivateKey(coinType: CoinType, account: number): string | undefined;
    getBalances(numAccounts: number, offset?: number): Promise<{
        [key in CoinType]?: Balance[];
    }>;
    enableCoin(coinType: CoinType): Promise<void>;
    disableCoin(coin: CoinType): void;
    getCoin(coinType: CoinType): Coin | undefined;
}
