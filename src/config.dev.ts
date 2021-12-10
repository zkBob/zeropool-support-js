import { Config } from './config';
import { ChainId as WavesChainId } from './coins/waves/config';

const config: Config = {
  near: {
    networkId: 'default',
    nodeUrl: 'https://rpc.testnet.near.org',
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
    explorerUrl: 'https://explorer.testnet.near.org',
  },
  ethereum: {
    httpProviderUrl: 'https://localhost:8535',
    relayerUrl: 'http://localhost:3000',
    contractAddress: '',
    tokenContractAddress: '',
  },
  waves: {
    nodeUrl: 'https://nodes-testnet.wavesnodes.com',
    chainId: WavesChainId.Testnet,
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
