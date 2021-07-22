import { Coin, Balance } from './coins/coin';
import { CoinType } from './coins/coin-type';

import { NearCoin } from './coins/near';
import { EthereumCoin } from './coins/ethereum';
import { WavesCoin } from './coins/waves';

import { Config } from './config';

export class HDWallet {
  public seed: string;
  private coins: { [key in CoinType]?: Coin; } = {};
  private config: Config;

  constructor(seed: string, config: Config) {
    this.seed = seed;
    this.config = config;
  }

  public async init(coinTypes: CoinType[]) {
    const promises = coinTypes.map(coin => this.enableCoin(coin as CoinType));
    await Promise.all(promises);
  }

  public getRegularAddress(coinType: CoinType, account: number): string | undefined {
    return this.getCoin(coinType)?.getAddress(account);
  }

  public getRegularPrivateKey(coinType: CoinType, account: number): string | undefined {
    return this.getCoin(coinType)?.getPrivateKey(account);
  }

  public async getBalances(numAccounts: number, offset: number = 0): Promise<{ [key in CoinType]?: Balance[]; }> {
    const promises = Object.entries(this.coins).map(([coinType, coin]) => {
      return coin!.getBalances(numAccounts, offset)
        .then((balances): [CoinType, Balance[]] => [coinType as CoinType, balances]);
    });

    const pairs = await Promise.all(promises);

    return pairs.reduce((balances, [coinType, balance]) => {
      balances[coinType] = balance;
      return balances;
    }, {});
  }

  public async enableCoin(coinType: CoinType) {
    let coin: Coin;
    switch (coinType) {
      case CoinType.near: {
        coin = new NearCoin(this.seed, this.config.near);
        break;
      }
      case CoinType.ethereum: {
        coin = new EthereumCoin(this.seed, this.config.ethereum);
        break;
      }
      case CoinType.waves: {
        coin = new WavesCoin(this.seed, this.config.waves);
        break;
      }
      default: {
        throw new Error(`CoinType ${coinType} is not implemented`);
      }
    }

    await coin.init();

    this.coins[coinType] = coin;
  }

  public disableCoin(coin: CoinType) {
    delete this.coins[coin];
  }

  public getCoin(coinType: CoinType): Coin | undefined {
    return this.coins[coinType];
  }
}
