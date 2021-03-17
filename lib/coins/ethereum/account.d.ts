import Web3 from 'web3';
import { Account } from 'web3-core';
import { Secp256k1HDKey } from '../../utils';
export declare class CachedAccount {
    account: Account;
    keypair: Secp256k1HDKey;
    constructor(keypair: Secp256k1HDKey, web3: Web3);
}
export declare class AccountCache {
    private root;
    private accounts;
    private web3;
    constructor(mnemonic: string, web3: Web3);
    getOrCreate(accountNumber: number): CachedAccount;
}
