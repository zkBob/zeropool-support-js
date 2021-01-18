import { CoinType } from '@trustwallet/wallet-core';
import { Coin } from './coins/coin';
import { NearCoin } from './coins/near';
import { EthereumCoin } from './coins/ethereum';
import { Config } from './config';

export class HDWallet {
  public seed: string;
  private coins: { [key in CoinType]?: Coin; };

  constructor(seed: string, coins: CoinType[], config: Config) {
    this.seed = seed;
    this.coins = {};

    for (let coin of coins) {
      switch (coin) {
        case CoinType.near: {
          this.coins[coin] = new NearCoin(seed, config.near);
          break;
        }
        case CoinType.ethereum: {
          this.coins[coin] = new EthereumCoin(seed, config.ethereum);
        }
        default: {
          throw new Error(`CoinType ${coin} is not implemented`);
        }
      }
    }
  }

  public getRegularAddress(coinType: CoinType): string {
    return this.getCoin(coinType).getAddress();
  }

  public getRegularPrivateKey(coinType: CoinType): string {
    return this.getCoin(coinType).getPrivateKey();
  }

  public getCoin(coinType: CoinType): Coin {
    const coin = this.coins[coinType];

    if (!coin) {
      throw new Error(`Coin ${coinType} is not initialized`);
    }

    return coin;
  }
}
