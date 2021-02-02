import { Coin } from './coins/coin';
import { CoinType } from './coins/coin-type';
import { NearCoin } from './coins/near';
import { EthereumCoin } from './coins/ethereum';
import { Config } from './config';

export class HDWallet {
  public seed: string;
  private coins: { [key in CoinType]?: Coin[]; } = {};
  private config: Config;

  constructor(seed: string, coins: { [key in CoinType]?: number; }, config: Config) {
    this.seed = seed;
    this.config = config;

    for (const [key, numAddresses] of Object.entries(coins)) {
      const coin: CoinType = Number(key);
      this.enableCoin(coin, numAddresses!);
    }
  }

  public getRegularAddress(coinType: CoinType, account: number): string | undefined {
    return this.getCoin(coinType, account)?.getAddress();
  }

  public getRegularPrivateKey(coinType: CoinType, account: number): string | undefined {
    return this.getCoin(coinType, account)?.getPrivateKey();
  }

  public async getBalances(): Promise<{ [key in CoinType]?: string; }> {
    const promises = Object.keys(this.coins).map(coinType => {
      const coin = this.getCoin(CoinType[coinType], 0)!;
      return coin.getBalance().then(balance => [coinType, balance]);
    });

    const pairs = await Promise.all(promises);

    return pairs.reduce((balances, [coinType, balance]) => {
      balances[coinType] = balance;
      return balances;
    }, {});
  }

  public enableCoin(coin: CoinType, numAddresses: number) {
    const instances: Coin[] = [];

    switch (coin) {
      case CoinType.near: {
        for (let address = 0; address < numAddresses; ++address) {
          instances.push(new NearCoin(this.seed, this.config.near, address));
        }

        break;
      }
      case CoinType.ethereum: {
        for (let address = 0; address < numAddresses; ++address) {
          instances.push(new EthereumCoin(this.seed, this.config.ethereum, address));
        }

        break;
      }
      default: {
        throw new Error(`CoinType ${coin} is not implemented`);
      }
    }

    this.coins[coin] = instances;
  }

  public disableCoin(coin: CoinType) {
    delete this.coins[coin];
  }

  public getCoin(coinType: CoinType, account: number): Coin | undefined {
    const coin = this.coins[coinType];

    if (!coin) {
      throw new Error(`Coin ${coinType} is not initialized`);
    }

    return coin[account];
  }
}
