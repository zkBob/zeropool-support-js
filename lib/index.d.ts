import { Client } from './networks/client';
export { Client } from './networks/client';
export { EthereumClient } from './networks/evm';
export { TronClient } from './networks/tron';
export declare enum SupportedNetwork {
    EvmNetwork = 0,
    TronNetwork = 1
}
export declare function networkType(chainId: number): SupportedNetwork | undefined;
export interface Config {
    transactionUrl: string;
}
export declare class ClientFactory {
    static createClient(chainId: number, rpcUrl: string, mnemonic: string, config: Config): Client;
}
