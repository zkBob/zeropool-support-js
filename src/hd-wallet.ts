import Web3 from 'web3';
import { wrap } from 'comlink';

import { Coin, Balance } from './coins/coin';
import { CoinType } from './coins/coin-type';
import { NearCoin } from './coins/near';
import { EthereumCoin } from './coins/ethereum';
import { WavesCoin } from './coins/waves';
import { Config, SnarkParams } from './config';
import { Params } from './libzeropool-rs';
import { ZeroPoolState } from './state';
import { RelayerBackend } from './coins/ethereum/relayer';
import { deriveSpendingKey } from './utils';

export class HDWallet {
  public seed: string;
  private coins: { [key in CoinType]?: Coin; } = {};
  private config: Config;
  private snarkParams: SnarkParams;
  private worker: any;

  public static async init(seed: string, config: Config): Promise<HDWallet> {
    const wallet = new HDWallet();

    const txParamsData = await (await fetch(config.snarkParams.transferParamsUrl)).arrayBuffer();
    const transferParams = Params.fromBinary(new Uint8Array(txParamsData));

    const treeParamsData = await (await fetch(config.snarkParams.treeParamsUrl)).arrayBuffer();
    const treeParams = Params.fromBinary(new Uint8Array(treeParamsData));

    const transferVk = await (await fetch(config.snarkParams.transferVkUrl)).json();
    const treeVk = await (await fetch(config.snarkParams.treeVkUrl)).json();

    const worker: any = wrap(new Worker(config.workerPath));
    await worker.initWasm(config.wasmPath, {
      txParams: config.snarkParams.transferParamsUrl,
      treeParams: config.snarkParams.treeParamsUrl,
    });

    wallet.snarkParams = {
      transferParams,
      treeParams,
      transferVk,
      treeVk,
    };
    wallet.seed = seed;
    wallet.config = config;
    wallet.worker = worker;

    const promises: Promise<void>[] = [];
    for (let coinType in CoinType) {
      if (config[coinType]) {
        promises.push(wallet.enableCoin(coinType as CoinType, config[coinType]));
      }
    }

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

  public async enableCoin(coinType: CoinType, config: any) {
    let coin: Coin;
    switch (coinType) {
      case CoinType.near: {
        coin = new NearCoin(this.seed, config, this.worker);
        break;
      }
      case CoinType.ethereum: {
        // TODO: Encapsulate backend selection and key derivation?
        const sk = deriveSpendingKey(this.seed, CoinType.ethereum);
        const state = await ZeroPoolState.create(sk, CoinType.ethereum as string, BigInt(1000000000)); // FIXME: Replace with a constant
        const web3 = new Web3(config.httpProviderUrl);
        const backend = new RelayerBackend(new URL(config.relayerUrl), web3, state, this.snarkParams, config, this.worker);
        coin = new EthereumCoin(this.seed, web3, config, backend, this.worker);
        break;
      }
      case CoinType.waves: {
        coin = new WavesCoin(this.seed, config, this.worker);
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
