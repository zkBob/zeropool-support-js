import { SignKeyPair } from 'tweetnacl';
import { ChainId } from './config';
export declare class CachedAccount {
    keypair: SignKeyPair;
    address: string;
    constructor(keypair: SignKeyPair, chainId: ChainId);
    get privateKey(): string;
    get publicKey(): string;
}
export declare class AccountCache {
    private accounts;
    private seed;
    private chainId;
    constructor(mnemonic: string, chainId: ChainId);
    get(account: number): CachedAccount | undefined;
    getOrCreate(account: number): CachedAccount;
}
