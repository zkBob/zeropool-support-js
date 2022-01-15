import { Account } from 'near-api-js';
import { KeyPairEd25519 } from 'near-api-js/lib/utils/key_pair';
import { KeyStore } from 'near-api-js/lib/key_stores';
import { Config } from './config';
export declare class CachedAccount {
    account: Account | undefined;
    keypair: KeyPairEd25519;
    constructor(keypair: KeyPairEd25519);
    init(config: Config, keyStore: KeyStore): Promise<void>;
    getAddress(): string;
    isInitialized(): boolean;
}
export declare class AccountCache {
    private accounts;
    get(account: number): CachedAccount | undefined;
    getOrCreate(mnemonic: string, account: number): CachedAccount;
    getOrInit(mnemonic: string, account: number, config: Config, keyStore: KeyStore): Promise<CachedAccount>;
}
