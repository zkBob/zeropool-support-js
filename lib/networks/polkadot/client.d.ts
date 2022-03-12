import '@polkadot/api-augment/substrate';
import { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { Client } from '../../networks/client';
export declare class PolkadotClient extends Client {
    keyring: Keyring;
    account: KeyringPair;
    api: ApiPromise;
    static create(account: string, rpcUrl: string): Promise<PolkadotClient>;
    getAddress(): Promise<string>;
    getPublicKey(): Promise<string>;
    getBalance(): Promise<string>;
    transfer(to: string, amount: string): Promise<void>;
    /**
     * Converts DOT to Planck.
     * @param amount in Ether
     */
    toBaseUnit(amount: string): string;
    /**
     * Converts Planck to DOT.
     * @param amount in Wei
     */
    fromBaseUnit(amount: string): string;
    mint(tokenAddress: string, amount: string): Promise<void>;
    sign(data: string): Promise<string>;
}
