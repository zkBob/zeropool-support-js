import bs58 from 'bs58';
import { derivePath } from 'ed25519-hd-key';
import { sign, SignKeyPair } from 'tweetnacl';
import { blake2b, keccak } from '@waves/ts-lib-crypto'

import { ChainId } from './config';
import { CoinType } from '../coin-type';
import { preprocessMnemonic } from '../../utils';

import bip39 from 'bip39-light';

export class CachedAccount {
  public keypair: SignKeyPair;
  public address: string;

  constructor(keypair: SignKeyPair, chainId: ChainId) {
    this.keypair = keypair;

    const buffer = new Uint8Array(26);
    buffer[0] = 1; // Entity type (always = 1)
    buffer[1] = ChainId.chainIdNumber(chainId);
    const pubHash = keccak(blake2b(keypair.publicKey)).slice(0, 20);
    buffer.set(pubHash, 2);
    const hash = keccak(blake2b(buffer.slice(0, 22))).slice(0, 4)
    buffer.set(hash, 22);

    this.address = bs58.encode(buffer);
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
  private chainId: ChainId;

  constructor(mnemonic: string, chainId: ChainId) {
    this.seed = bip39.mnemonicToSeed(preprocessMnemonic(mnemonic));
    this.chainId = chainId;
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
    cachedAccount = new CachedAccount(keypair, this.chainId);

    this.accounts[account] = cachedAccount;

    return cachedAccount;
  }
}
