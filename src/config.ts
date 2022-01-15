import { Config as NearConfig } from './networks/near';
import { Config as EvmConfig } from './networks/evm';
import { Config as WavesConfig } from './networks/waves';
import { Params, VK } from './libzeropool-rs';
import { NetworkType } from '.';

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

export type Networks = {
  [ty in NetworkType]?: Tokens;
}

export interface Tokens {
  [address: string]: Token;
}

export interface Token {
  poolAddress: string;
  relayerUrl: string;
  denominator: bigint;
}
