import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import bcrypt from 'bcryptjs';
import { CoinType, TW } from '@trustwallet/wallet-core';


import { Wallet } from './wallet';
import { parseSeedPhrase, encodeKeys as encodeKeys } from './utils';

const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export class LocalAccountStorage {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    getAllAccounts(): string[] {
        const accs = localStorage.getItem(`${this.prefix}.accounts`);

        if (!accs) {
            return [];
        }

        return JSON.parse(accs);
    }

    addAccount(name: string) {
        const accs = new Set(this.getAllAccounts());
        accs.add(name);

        const newAccs = JSON.stringify(new Array(accs));
        localStorage.setItem(`${this.prefix}.accounts`, newAccs);
    }

    get(accountName: string, field: string): string {
        const val = localStorage.getItem(`${this.prefix}.${accountName}.${field}`);

        if (!val) {
            throw new Error(`Field ${accountName}.${field} is not set`);
        }

        return val;
    }

    set(accountName: string, field: string, value: string) {
        localStorage.setItem(`${this.prefix}.${accountName}.${field}`, value);
    }
}

export class Auth {
    private seed: string;
    private lockTimeout?: ReturnType<typeof setTimeout>;
    private storage: LocalAccountStorage;
    readonly accountName: string;
}

export class AuthenticatedAccount {
    private seed: string;
}

// TODO: Extract timeout management code
export class LocalAccount {
    private seed: string;
    private lockTimeout?: ReturnType<typeof setTimeout>;
    readonly accountName: string;
    private storage: LocalAccountStorage;
    private wallets: { [key in CoinType]: Wallet; };

    constructor(accountName: string, storage: LocalAccountStorage) {
        this.accountName = accountName;
        this.storage = storage;
    }

    public async login(seed: string, password: string) {
        // const keyPair = parseSeedPhrase(seed);
        // const { secretKey, publicKey } = encodeKeys(keyPair)

        this.seed = seed;

        this.storage.set(this.accountName, 'seed', await AES.encrypt(seed, password).toString());
        this.storage.set(this.accountName, 'pwHash', await bcrypt.hash(password, await bcrypt.genSalt(10)));

        this.setAccountTimeout(LOCK_TIMEOUT);
    }

    public isAccountPresent(): boolean {
        return !!this.storage.get(this.accountName, 'pwHash');
    }

    public getSeed(password: string): string {
        this.checkPassword(password);
        return this.decryptSeed(password);
    }

    public unlockAccount(password: string) {
        this.checkPassword(password);
        this.seed = this.decryptSeed(password);
    }

    public checkPassword(password: String) {
        const hash = this.storage.get(this.accountName, 'pwHash');

        if (!bcrypt.compare(hash, password)) {
            throw new Error('Incorrect password');
        }

        this.setAccountTimeout(LOCK_TIMEOUT);
    }

    public getRegularAddress(coinType: CoinType): string {
        this.requireAuth();

        // TOOD: proper path for each coin
        const path = `m/44'/${coinType}'/0'`;
        const pair = parseSeedPhrase(this.seed, path);

        // TODO: Ability to specify encoding?
        const address = Buffer.from(pair.publicKey).toString('hex');

        return address;
    }

    public exportRegularPrivateKey(coinType: CoinType, password: string): string {
        this.unlockAccount(password);

        // TOOD: proper path for each coin
        const path = `m/44'/${coinType}'/0'`;
        const pair = parseSeedPhrase(this.seed, path);
        const { secretKey } = encodeKeys(pair);

        return secretKey;
    }

    public isLocked(): boolean {
        return !this.seed;
    }

    public requireAuth() {
        if (this.isLocked()) {
            throw Error('Account is locked. Unlock the account first');
        }

        this.setAccountTimeout(LOCK_TIMEOUT);
    }

    private setAccountTimeout(ms: number) {
        if (this.lockTimeout) {
            clearTimeout(this.lockTimeout);
        }

        this.lockTimeout = setTimeout(function () {
            this.cache = null;
        }, ms);
    }

    private decryptSeed(password: string): string {
        const cipherText = this.storage.get(this.accountName, 'seed');
        const data = AES.decrypt(cipherText, password).toString(Utf8);

        return data;
    }
}
