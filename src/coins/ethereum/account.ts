import bip39 from 'bip39-light';
import Web3 from 'web3';
import { Account } from 'web3-core';

import { preprocessMnemonic, HDKey } from '../../utils';
import { CoinType } from '../coin-type';

export class CachedAccount {
  public account: Account;
  public keypair: HDKey;

  constructor(keypair: HDKey, web3: Web3) {
    this.keypair = keypair;
    const privateKey = '0x' + this.keypair.privateKey.toString('hex');
    this.account = web3.eth.accounts.privateKeyToAccount(privateKey);
  }
}

export class AccountCache {
  private root: HDKey;
  private accounts: CachedAccount[] = [];
  private web3: Web3;

  constructor(mnemonic: string, web3: Web3) {
    const processed = preprocessMnemonic(mnemonic);

    // validate mnemonic
    bip39.mnemonicToEntropy(processed);

    const path = CoinType.chainPath(CoinType.ethereum);
    const seed = bip39.mnemonicToSeed(processed);

    const hdkey = HDKey.fromMasterSeed(seed);
    this.root = hdkey.derive(path);
    this.web3 = web3;
  }

  getOrCreate(accountNumber: number): CachedAccount {
    let account = this.accounts[accountNumber];
    if (account) {
      return account;
    }

    const keypair = this.root.derive(CoinType.accountPath(CoinType.ethereum, accountNumber));
    account = new CachedAccount(keypair, this.web3);
    this.accounts[accountNumber] = account;

    return account;
  }
}
