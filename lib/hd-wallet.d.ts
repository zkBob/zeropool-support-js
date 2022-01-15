import { Network, Balance } from './networks/network';
import { NetworkType } from './networks/network-type';
import { Config } from './config';
export declare class HDWallet {
    seed: string;
    private networks;
    private config;
    private snarkParams;
    private worker;
    static init(seed: string, config: Config): Promise<HDWallet>;
    getRegularAddress(networkType: NetworkType, account: number): string | undefined;
    getRegularPrivateKey(networkType: NetworkType, account: number): string | undefined;
    getBalances(numAccounts: number, offset?: number): Promise<{
        [key in NetworkType]?: Balance[];
    }>;
    enableNetwork(networkType: NetworkType, config: any): Promise<void>;
    disableNetwork(network: NetworkType): void;
    getNetwork(networkType: NetworkType): Network | undefined;
    free(): void;
}
