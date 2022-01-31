import { NetworkType } from '.';
import { Config } from './config';
import { ChainId as WavesChainId } from './networks/waves/config';


const config: Config = {
  networks: {
    [NetworkType.near]: {
      networkId: 'mainnet',
      nodeUrl: 'https://rpc.mainnet.near.org',
      explorerUrl: 'https://explorer.mainnet.near.org',
      tokens: {},
    },
    [NetworkType.ethereum]: {
      httpProviderUrl: 'https://main-rpc.linkpool.io',
      tokens: {},
    },
    [NetworkType.waves]: {
      nodeUrl: 'https://nodes.wavesplatform.com',
      chainId: WavesChainId.Mainnet,
      tokens: {},
    },
  },
  snarkParams: {
    transferParamsUrl: 'transfer_params.bin',
    treeParamsUrl: 'tree_update_params.bin',
    transferVkUrl: 'transfer_verification_key.json',
    treeVkUrl: 'tree_update_verification_key.json'
  },
  wasmPath: '',
  workerPath: ''
};

export default config;
