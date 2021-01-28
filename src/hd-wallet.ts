import { CoinType } from '@trustwallet/wallet-core';
import { Coin } from './coins/coin';
import { NearCoin } from './coins/near';
import { EthereumCoin } from './coins/ethereum';
import { Config } from './config';

export class HDWallet {
  public seed: string;
  private coins: { [key in CoinType]?: Coin[]; } = {};

  constructor(seed: string, coins: { [key in CoinType]?: number; }, config: Config) {
    this.seed = seed;

    for (const key in coins) {
      const coin = CoinType[key];
      const accounts = coins[coin];

      if (!this.coins[coin]) {
        this.coins[coin] = [];
      }

      switch (coin) {
        case CoinType.near: {
          for (let account = 0; account < accounts; ++account) {
            this.coins[coin].push(new NearCoin(seed, config.near, account));
          }

          break;
        }
        case CoinType.ethereum: {
          for (let account = 0; account < accounts; ++account) {
            this.coins[coin].push(new EthereumCoin(seed, config.ethereum, account));
          }

          break;
        }
        default: {
          throw new Error(`CoinType ${coin} is not implemented`);
        }
      }
    }
  }

  public getRegularAddress(coinType: CoinType, account: number): string | undefined {
    return this.getCoin(coinType, account)?.getAddress();
  }

  public getRegularPrivateKey(coinType: CoinType, account: number): string | undefined {
    return this.getCoin(coinType, account)?.getPrivateKey();
  }

  public getCoin(coinType: CoinType, account: number): Coin | undefined {
    const coin = this.coins[coinType];

    if (!coin) {
      throw new Error(`Coin ${coinType} is not initialized`);
    }

    return coin[account];
  }
}
