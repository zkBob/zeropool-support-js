import { Config as NearConfig } from './coins/near';
import { Config as EvmConfig } from './coins/ethereum';
import { Config as WavesConfig } from './coins/waves';
import { Params, VK } from './libzeropool-rs';
import { CoinType } from '.';
export interface Config {
    near?: NearConfig;
    ethereum?: EvmConfig;
    aurora?: EvmConfig;
    xdai?: EvmConfig;
    waves?: WavesConfig;
    networks: Networks;
    snarkParams: SnarkConfigParams;
    wasmPath: string;
    workerPath: string;
}
export interface SnarkConfigParams {
    transferParamsUrl: string;
    treeParamsUrl: string;
    transferVkUrl: string;
    treeVkUrl: string;
}
export interface SnarkParams {
    transferParams: Params;
    treeParams: Params;
    transferVk?: VK;
    treeVk?: VK;
}
export declare type Networks = {
    [ty in CoinType]?: Tokens;
};
export interface Tokens {
    [address: string]: Token;
}
export interface Token {
    poolAddress: string;
    relayerUrl: string;
    denominator: bigint;
}
