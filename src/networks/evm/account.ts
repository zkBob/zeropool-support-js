import bip39 from 'bip39-light';
import Web3 from 'web3';
import { Account } from 'web3-core';

import { preprocessMnemonic, Secp256k1HDKey } from '@/utils';
import { NetworkType } from '../network-type';

export class CachedAccount {
  public account: Account;
  public keypair: Secp256k1HDKey;

  constructor(keypair: Secp256k1HDKey, web3: Web3) {
    this.keypair = keypair;
    const privateKey = '0x' + this.keypair.privateKey.toString('hex');
    this.account = web3.eth.accounts.privateKeyToAccount(privateKey);
  }
}

export class AccountCache {
  private root: Secp256k1HDKey;
  private accounts: CachedAccount[] = [];
  private web3: Web3;

  constructor(mnemonic: string, web3: Web3) {
    const processed = preprocessMnemonic(mnemonic);

    // validate mnemonic
    bip39.mnemonicToEntropy(processed);

    const path = NetworkType.chainPath(NetworkType.ethereum);
    const seed = bip39.mnemonicToSeed(processed);

    const hdkey = Secp256k1HDKey.fromMasterSeed(seed);
    this.root = hdkey.derive(path);
    this.web3 = web3;
  }

  getOrCreate(accountNumber: number): CachedAccount {
    let account = this.accounts[accountNumber];
    if (account) {
      return account;
    }

    const keypair = this.root.derive('m' + NetworkType.accountPath(NetworkType.ethereum, accountNumber));
    account = new CachedAccount(keypair, this.web3);
    this.accounts[accountNumber] = account;

    return account;
  }
}
