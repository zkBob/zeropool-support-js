import { Coin, Balance } from './coins/coin';
import { CoinType } from './coins/coin-type';

import { NearCoin } from './coins/near';
import { EthereumCoin } from './coins/ethereum';
import { WavesCoin } from './coins/waves';

import { Config } from './config';
import { Params } from 'libzeropool-rs-wasm-bundler';

export class HDWallet {
  public seed: string;
  private coins: { [key in CoinType]?: Coin; } = {};
  private config: Config;
  private params: Params;

  public static async init(seed: string, config: Config, coinTypes: CoinType[]): Promise<HDWallet> {
    const wallet = new HDWallet();

    const paramsData = await (await fetch(config.paramsUrl)).arrayBuffer();
    const params = Params.fromBinary(new Uint8Array(paramsData));

    wallet.params = params;
    wallet.seed = seed;
    wallet.config = config;

    const promises = coinTypes.map(coin => wallet.enableCoin(coin as CoinType));
    await Promise.all(promises);

    return wallet;
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
        coin = new EthereumCoin(this.seed, this.config.ethereum, this.params);
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

    await coin.ready();

    this.coins[coinType] = coin;
  }

  public disableCoin(coin: CoinType) {
    delete this.coins[coin];
  }

  public getCoin(coinType: CoinType): Coin | undefined {
    return this.coins[coinType];
  }
}
