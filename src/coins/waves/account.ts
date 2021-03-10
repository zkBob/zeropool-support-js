import bs58 from 'bs58';
import { derivePath } from 'ed25519-hd-key';
import { sign, SignKeyPair } from 'tweetnacl';

import { CoinType } from '../coin-type';
import { preprocessMnemonic } from '../../utils';

import bip39 from 'bip39-light';

export class CachedAccount {
  public keypair: SignKeyPair;

  constructor(keypair: SignKeyPair) {
    this.keypair = keypair;
  }

  get address(): string {
    return this.publicKey;
  }

  get privateKey(): string {
    return bs58.encode(Buffer.from(this.keypair.secretKey));
  }

  get publicKey(): string {
    return bs58.encode(Buffer.from(this.keypair.publicKey));
  }
}

export class AccountCache {
  private accounts: CachedAccount[] = [];
  private seed: Buffer;

  constructor(mnemonic: string) {
    this.seed = bip39.mnemonicToSeed(preprocessMnemonic(mnemonic));
  }

  get(account: number): CachedAccount | undefined {
    return this.accounts[account];
  }

  getOrCreate(account: number): CachedAccount {
    let cachedAccount = this.accounts[account];
    if (cachedAccount) {
      return cachedAccount;
    }

    const path = CoinType.derivationPath(CoinType.waves, account);
    const { key } = derivePath(path, this.seed.toString('hex'));
    const keypair = sign.keyPair.fromSeed(key);
    cachedAccount = new CachedAccount(keypair);

    this.accounts[account] = cachedAccount;

    return cachedAccount;
  }
}
