import { SignKeyPair } from 'tweetnacl';
export declare class CachedAccount {
    keypair: SignKeyPair;
    constructor(keypair: SignKeyPair);
    get address(): string;
    get privateKey(): string;
    get publicKey(): string;
}
export declare class AccountCache {
    private accounts;
    private seed;
    constructor(mnemonic: string);
    get(account: number): CachedAccount | undefined;
    getOrCreate(account: number): CachedAccount;
}
