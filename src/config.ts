import { Config as NearConfig } from './networks/near';
import { Config as EvmConfig } from './networks/evm';
import { Config as WavesConfig } from './networks/waves';
import { Params, VK } from './libzeropool-rs';
import { NetworkType } from '.';

export interface Config {
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

export type Networks = {
  [ty in NetworkType]?: NetworkConfig;
}

export type NetworkConfig = (NearConfig | EvmConfig | WavesConfig) & { tokens: Tokens };

export type Tokens = {
  [address: string]: Token;
};

export interface Token {
  poolAddress: string;
  relayerUrl: string;
  denominator: bigint;
}
