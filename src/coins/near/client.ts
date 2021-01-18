import BN from 'bn.js';
import { Account, KeyPair, connect } from 'near-api-js';
import { KeyStore, InMemoryKeyStore } from 'near-api-js/lib/key_stores';
import { AccountBalance } from 'near-api-js/lib/account';

import { Config } from './config';

export class NearClient {
  private keyStore: KeyStore;
  readonly config: Config;
  private address: string;
  private privateKey: string;
  public nearAccount?: Account;

  constructor(config: Config, address: string, privateKey: string) {
    this.keyStore = new InMemoryKeyStore();
    this.config = config;
    this.address = address;
    this.privateKey = privateKey;
  }

  public async login(): Promise<Account> {
    await this.keyStore.setKey(this.config.networkId, this.address, KeyPair.fromString(this.privateKey));

    const options = { ...this.config, deps: { keyStore: this.keyStore } };
    const near = await connect(options);

    return await near.account(this.address);
  }

  public async transfer(to: string, amount: string) {
    if (!this.nearAccount) {
      this.nearAccount = await this.login();
    }

    await this.nearAccount.sendMoney(to, new BN(amount));
  }

  public async getBalance(): Promise<AccountBalance> {
    if (!this.nearAccount) {
      this.nearAccount = await this.login();
    }

    return await this.nearAccount.getAccountBalance();
  }
}
