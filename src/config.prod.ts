import { Config } from './config';
import { ChainId as WavesChainId } from './coins/waves/config';

const config: Config = {
  near: {
    networkId: 'mainnet',
    nodeUrl: 'https://rpc.mainnet.near.org',
    walletUrl: 'https://wallet.near.org',
    helperUrl: 'https://helper.mainnet.near.org',
    explorerUrl: 'https://explorer.mainnet.near.org',
  },
  ethereum: {
    httpProviderUrl: 'https://main-rpc.linkpool.io',
    relayerUrl: 'http://localhost:3000',
    contractAddress: '',
    tokenContractAddress: '',
  },
  waves: {
    nodeUrl: 'https://nodes.wavesplatform.com',
    chainId: WavesChainId.Mainnet,
  },
  snarkParams: {
    transferParamsUrl: 'transfer_params.bin',
    treeParamsUrl: 'tree_update_params.bin',
    transferVkUrl: 'transfer_verification_key.json',
    treeVkUrl: 'tree_verification_key.json'
  },
  wasmPath: '',
  workerPath: ''
};

export default config;
