import { Client } from './networks/client';
import { EthereumClient } from './networks/evm';
import { TronClient } from './networks/tron'

import HDWalletProvider from '@truffle/hdwallet-provider';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';


export { Client } from './networks/client';
export { EthereumClient } from './networks/evm';
export { TronClient } from './networks/tron'

enum SupportedNetwork {
    EvmNetwork,
    TronNetwork,
}

function networkType(chainId: number): SupportedNetwork | undefined {
    if ([0x2b6653dc, 0x94a9059e].includes(chainId)) {
        return SupportedNetwork.TronNetwork;
    } else if ([1, 137, 10, 11155111, 5, 420, 1337, 31337].includes(chainId)) {
        return SupportedNetwork.EvmNetwork;
    }

    return undefined;
}

export interface Config {
    transactionUrl: string;
}

export class ClientFactory {
    static createClient(chainId: number, rpcUrl: string, mnemonic: string, config: Config): Client {
        const type = networkType(chainId);
        switch (type) {
            case SupportedNetwork.TronNetwork: {
                let seed = mnemonicToSeedSync(mnemonic);
                let ephemeralWalletPath = `m/44'/195'/0'/0`;
                const hdwallet = HDKey.fromMasterSeed(seed).derive(ephemeralWalletPath);
                const privKey = hdwallet.deriveChild(0).privateKey;
                if (privKey) {
                    return new TronClient(rpcUrl, Buffer.from(privKey).toString('hex'), config);
                } else {
                    throw new Error(`Cannot derive BIP39 account`);
                }
            }

            case undefined:
                console.warn(`[ClientFactory] Unknown chain id provided (${chainId}). Assume it's an EVM network...`)
            case SupportedNetwork.EvmNetwork: {
                const provider = new HDWalletProvider({
                    mnemonic,
                    providerOrUrl: rpcUrl,
                });

                return new EthereumClient(provider, config);
            }

            default:
                throw new Error(`Unknown network type ${type}`);
        }
    }
}