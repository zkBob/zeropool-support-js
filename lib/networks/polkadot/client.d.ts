import '@polkadot/api-augment/substrate';
import { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { Client } from '../../networks/client';
export interface Config {
    rpcUrl: string;
    /** Transaction URL template with the transaction hash place marked as {{hash}} */
    transactionUrl: string;
}
export declare class PolkadotClient extends Client {
    keyring: Keyring;
    account: KeyringPair;
    api: ApiPromise;
    config: Config;
    static create(account: string, config: Config): Promise<PolkadotClient>;
    getAddress(): Promise<string>;
    getPublicKey(): Promise<string>;
    getBalance(): Promise<string>;
    transfer(to: string, amount: string): Promise<string>;
    /**
     * Converts DOT to Planck.
     * @param amount in Ether
     */
    toBaseUnit(tokenAddress: string, amount: string): Promise<string>;
    /**
     * Converts Planck to DOT.
     * @param amount in Wei
     */
    fromBaseUnit(tokenAddress: string, amount: string): Promise<string>;
    mint(tokenAddress: string, amount: string): Promise<string>;
    /** Expects a hex string and returns a hex string */
    sign(data: string): Promise<string>;
}
