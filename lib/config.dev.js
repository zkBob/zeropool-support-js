import { ChainId as WavesChainId } from './coins/waves/config';
var config = {
    near: {
        networkId: 'default',
        nodeUrl: 'https://rpc.testnet.near.org',
        walletUrl: 'https://wallet.testnet.near.org',
        helperUrl: 'https://helper.testnet.near.org',
        explorerUrl: 'https://explorer.testnet.near.org',
    },
    ethereum: {
        httpProviderUrl: 'https://localhost:8535',
        wsProviderUrl: 'wss://kovan.infura.io/ws/v3/e3c6db75d33d410aa2271816551817a7',
        contractAddress: '',
        contractBlock: 0,
        tokenContractAddress: '',
    },
    waves: {
        nodeUrl: 'https://nodes-testnet.wavesnodes.com',
        chainId: WavesChainId.Testnet,
    },
    transferParamsUrl: 'transfer_params.bin',
    treeParamsUrl: 'tree_update_params.bin',
};
export default config;
//# sourceMappingURL=config.dev.js.map