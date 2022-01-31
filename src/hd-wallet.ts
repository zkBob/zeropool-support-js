import Web3 from 'web3';
import { wrap } from 'comlink';

import { Network, Balance } from './networks/network';
import { NetworkType } from './networks/network-type';
import { NearNetwork } from './networks/near';
import { EvmNetwork } from './networks/evm';
import { WavesNetwork } from './networks/waves';
import { Config, SnarkParams } from './config';
import { Params } from './libzeropool-rs';
import { ZeroPoolState } from './state';
import { RelayerBackend } from './networks/evm/relayer';
import { deriveSpendingKey } from './utils';
import { FileCache } from './file-cache';

export class HDWallet {
  public seed: string;
  private networks: { [key in NetworkType]?: Network; } = {};
  private config: Config;
  private snarkParams: SnarkParams;
  private worker: any;

  public static async init(seed: string, config: Config): Promise<HDWallet> {
    const wallet = new HDWallet();

    const cache = await FileCache.init();

    const txParamsData = await cache.getOrCache(config.snarkParams.transferParamsUrl);
    const transferParams = Params.fromBinary(new Uint8Array(txParamsData));

    const treeParamsData = await cache.getOrCache(config.snarkParams.treeParamsUrl);
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
    for (let networkType in NetworkType) {
      if (config.networks[networkType]) {
        promises.push(wallet.enableNetwork(networkType as NetworkType, config.networks[networkType]));
      }
    }

    await Promise.all(promises);

    return wallet;
  }

  public getRegularAddress(networkType: NetworkType, account: number): string | undefined {
    return this.getNetwork(networkType)?.getAddress(account);
  }

  public getRegularPrivateKey(networkType: NetworkType, account: number): string | undefined {
    return this.getNetwork(networkType)?.getPrivateKey(account);
  }

  public async getBalances(numAccounts: number, offset: number = 0): Promise<{ [key in NetworkType]?: Balance[]; }> {
    const promises = Object.entries(this.networks).map(([networkType, network]) => {
      return network!.getBalances(numAccounts, offset)
        .then((balances): [NetworkType, Balance[]] => [networkType as NetworkType, balances]);
    });

    const pairs = await Promise.all(promises);

    return pairs.reduce((balances, [networkType, balance]) => {
      balances[networkType] = balance;
      return balances;
    }, {});
  }

  public async enableNetwork(networkType: NetworkType, config: any) {
    let network: Network;
    switch (networkType) {
      case NetworkType.near: {
        const sk = deriveSpendingKey(this.seed, NetworkType.ethereum);
        const state = await ZeroPoolState.create(sk, NetworkType.near as string, BigInt(1000000000));
        network = new NearNetwork(this.seed, config, state, this.worker);
        break;
      }
      case NetworkType.ethereum:
      case NetworkType.xdai:
      case NetworkType.aurora: {
        const sk = deriveSpendingKey(this.seed, networkType);
        const state = await ZeroPoolState.create(sk, networkType as string, BigInt(1000000000)); // FIXME: use token config
        const web3 = new Web3(config.httpProviderUrl);
        const backend = new RelayerBackend(config.tokens, web3, state, this.snarkParams, this.worker);
        network = new EvmNetwork(this.seed, web3, config, state, backend, this.worker);
        break;
      }
      case NetworkType.waves: {
        const sk = deriveSpendingKey(this.seed, NetworkType.waves);
        const state = await ZeroPoolState.create(sk, NetworkType.near as string, BigInt(1000000000));
        network = new WavesNetwork(this.seed, config, state, this.worker);
        break;
      }
      default: {
        throw new Error(`NetworkType ${networkType} is not implemented`);
      }
    }

    this.networks[networkType] = network;
  }

  public disableNetwork(network: NetworkType) {
    if (this.networks[network]) {
      this.getNetwork(network)!.free();
      delete this.networks[network];
    }

  }

  public getNetwork(networkType: NetworkType): Network | undefined {
    return this.networks[networkType];
  }

  public free(): void {
    for (const key of Object.keys(this.networks)) {
      this.networks[key].free();
    }
  }
}
