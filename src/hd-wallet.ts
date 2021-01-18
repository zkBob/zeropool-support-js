import { CoinType } from '@trustwallet/wallet-core';
import { Coin } from './coins/coin';
import { NearCoin } from './coins/near/coin';
import { Environment as NearEnv } from './coins/near/config';

export class HDWallet {
  public seed: string;
  private coins: { [key in CoinType]?: Coin; };

  constructor(seed: string, coins: CoinType[]) {
    this.seed = seed;
    this.coins = {};

    for (let coin of coins) {
      switch (coin) {
        case CoinType.near: {
          this.coins[coin] = new NearCoin(NearEnv.MainNet, seed);
          break;
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
