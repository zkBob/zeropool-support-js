import { Coin } from './coins/coin';
import { CoinType } from './coins/coin-type';

import { NearCoin } from './coins/near';
import { EthereumCoin } from './coins/ethereum';
import { WavesCoin } from './coins/waves';

import { Config } from './config';

export class HDWallet {
  public seed: string;
  private coins: { [key in CoinType]?: Coin; } = {};
  private config: Config;

  constructor(seed: string, config: Config, coins: CoinType[]) {
    this.seed = seed;
    this.config = config;

    for (const value of coins) {
      const coin: CoinType = Number(value);
      this.enableCoin(coin);
    }
  }

  public getRegularAddress(coinType: CoinType, account: number): string | undefined {
    return this.getCoin(coinType)?.getAddress(account);
  }

  public getRegularPrivateKey(coinType: CoinType, account: number): string | undefined {
    return this.getCoin(coinType)?.getPrivateKey(account);
  }

  public async getBalances(account: number): Promise<{ [key in CoinType]?: string | Error; }> {
    const promises = Object.keys(this.coins).map(coinTypeStr => {
      const coinType: CoinType = parseInt(coinTypeStr);
      const coin = this.getCoin(coinType)!;
      return coin.getBalance(account)
        .then(balance => [coinType, balance])
        .catch((err) => [coinType, err]);
    });

    const pairs = await Promise.all(promises);

    return pairs.reduce((balances, [coinType, balance]) => {
      balances[coinType] = balance;
      return balances;
    }, {});
  }

  public enableCoin(coin: CoinType) {
    switch (coin) {
      case CoinType.near: {
        this.coins[coin] = new NearCoin(this.seed, this.config.near);
        break;
      }
      case CoinType.ethereum: {
        this.coins[coin] = new EthereumCoin(this.seed, this.config.ethereum);
        break;
      }
      case CoinType.waves: {
        this.coins[coin] = new WavesCoin(this.seed, this.config.waves);
        break;
      }
      default: {
        throw new Error(`CoinType ${coin} is not implemented`);
      }
    }
  }

  public disableCoin(coin: CoinType) {
    delete this.coins[coin];
  }

  public getCoin(coinType: CoinType): Coin | undefined {
    return this.coins[coinType];
  }
}
