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
    httpProviderUrl: 'https://kovan.infura.io/v3/e3c6db75d33d410aa2271816551817a7',
    wsProviderUrl: 'wss://kovan.infura.io/ws/v3/e3c6db75d33d410aa2271816551817a7',
  },
  waves: {
    nodeUrl: 'https://nodes-testnet.wavesnodes.com',
    chainId: WavesChainId.Testnet,
  },
}

export default config;
