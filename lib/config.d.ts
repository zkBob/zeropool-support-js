import { Config as NearConfig } from './coins/near';
import { Config as EthereumConfig } from './coins/ethereum';
export interface Config {
    near: NearConfig;
    ethereum: EthereumConfig;
}
