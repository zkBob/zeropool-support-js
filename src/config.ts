import { Config as NearConfig } from './coins/near';
import { Config as EthereumConfig } from './coins/ethereum';
import { Config as WavesConfig } from './coins/waves';

export interface Config {
  near: NearConfig;
  ethereum: EthereumConfig;
  waves: WavesConfig;

  transferParamsUrl: string;
  treeParamsUrl: string;
}
