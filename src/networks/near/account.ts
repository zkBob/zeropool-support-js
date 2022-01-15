import bs58 from 'bs58';
import { derivePath } from 'ed25519-hd-key';
import { sign } from 'tweetnacl';
import { Account, connect } from 'near-api-js';
import { KeyPairEd25519 } from 'near-api-js/lib/utils/key_pair';
import { KeyStore } from 'near-api-js/lib/key_stores';

import { preprocessMnemonic } from '@/utils';
import { NetworkType } from '@/networks/network-type';
import { Config } from './config';

import bip39 from 'bip39-light';
export class CachedAccount {
  public account: Account | undefined;
  public keypair: KeyPairEd25519;

  constructor(keypair: KeyPairEd25519) {
    this.keypair = keypair;
  }

  async init(config: Config, keyStore: KeyStore) {
    await keyStore.setKey(
      config.networkId,
      this.getAddress(),
      this.keypair,
    );

    const options = { ...config, deps: { keyStore: keyStore } };
    const near = await connect(options);

    this.account = await near.account(this.getAddress());
  }

  getAddress(): string {
    return Buffer.from(this.keypair.getPublicKey().data).toString('hex');
  }

  isInitialized(): boolean {
    return !!this.account;
  }
}

export class AccountCache {
  private accounts: CachedAccount[] = [];

  get(account: number): CachedAccount | undefined {
    return this.accounts[account];
  }

  getOrCreate(mnemonic: string, account: number): CachedAccount {
    let nearAccount = this.accounts[account];
    if (nearAccount) {
      return nearAccount;
    }

    const processed = preprocessMnemonic(mnemonic);
    const path = NetworkType.derivationPath(NetworkType.near, account);
    const seed = bip39.mnemonicToSeed(processed);
    const { key } = derivePath(path, seed.toString('hex'));
    const naclKeypair = sign.keyPair.fromSeed(key);
    const privateKey = bs58.encode(Buffer.from(naclKeypair.secretKey));
    const keypair = KeyPairEd25519.fromString(privateKey) as KeyPairEd25519;
    nearAccount = new CachedAccount(keypair);

    this.accounts[account] = nearAccount;

    return nearAccount;
  }

  async getOrInit(mnemonic: string, account: number, config: Config, keyStore: KeyStore): Promise<CachedAccount> {
    const nearAccount = this.getOrCreate(mnemonic, account);

    if (!nearAccount.isInitialized()) {
      await nearAccount.init(config, keyStore);
    }

    return this.accounts[account];
  }
}
