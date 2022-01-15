import { Config } from './config';
import { ChainId as WavesChainId } from './networks/waves/config';

const config: Config = {
  near: {
    networkId: 'default',
    nodeUrl: 'https://rpc.testnet.near.org',
    explorerUrl: 'https://explorer.testnet.near.org',
  },
  ethereum: {
    httpProviderUrl: 'https://localhost:8535',
  },
  waves: {
    nodeUrl: 'https://nodes-testnet.wavesnodes.com',
    chainId: WavesChainId.Testnet,
  },
  snarkParams: {
    transferParamsUrl: 'transfer_params.bin',
    treeParamsUrl: 'tree_update_params.bin',
    transferVkUrl: 'transfer_verification_key.json',
    treeVkUrl: 'tree_update_verification_key.json'
  },
  networks: {},
  wasmPath: '',
  workerPath: 'worker.js'
};

export default config;
