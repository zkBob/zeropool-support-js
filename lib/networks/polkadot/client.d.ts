import '@polkadot/api-augment/substrate';
import { Client } from '@/networks/client';
import { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
export declare class PolkadotClient extends Client {
    keyring: Keyring;
    account: KeyringPair;
    api: ApiPromise;
    static create(account: string, rpcUrl: string): Promise<PolkadotClient>;
    getAddress(): string;
    getBalance(): Promise<string>;
    transfer(to: string, amount: string): Promise<void>;
    /**
     * Converts ether to Wei.
     * @param amount in Ether
     */
    toBaseUnit(amount: string): string;
    /**
     * Converts Wei to ether.
     * @param amount in Wei
     */
    fromBaseUnit(amount: string): string;
    mint(tokenAddress: string, amount: string): Promise<void>;
}
