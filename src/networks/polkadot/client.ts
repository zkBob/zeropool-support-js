
import { TxFee } from '@/networks/transaction';
import { Client } from '@/networks/client';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';

import { cryptoWaitReady } from '@polkadot/util-crypto';

export class PolkadotClient extends Client {
  keyring: Keyring;
  account: KeyringPair;
  api: ApiPromise;

  public static async create(account: string, rpcUrl: string): Promise<PolkadotClient> {
    await cryptoWaitReady();
    const client = new PolkadotClient();
    client.keyring = new Keyring();
    client.account = client.keyring.addFromUri(account);
    const wsProvider = new WsProvider(rpcUrl);
    client.api = await ApiPromise.create({ provider: wsProvider });

    return client;
  }

  public getAddress(): string {
    return this.account.address;
  }

  public async getBalance(): Promise<string> {
    // TODO: What to do with the reserved balance?
    // @ts-ignore
    const { data: { free } } = await this.api.query.system.account(this.account.address);

    return free;
  }

  public async transfer(to: string, amount: string): Promise<void> {
    await this.api.tx.balances.transfer(to, amount)
      .signAndSend(this.account);
  }

  /**
   * Converts ether to Wei.
   * @param amount in Ether
   */
  public toBaseUnit(amount: string): string {
    throw new Error('unimplemented')
  }

  /**
   * Converts Wei to ether.
   * @param amount in Wei
   */
  public fromBaseUnit(amount: string): string {
    throw new Error('unimplemented')
  }

  // public async estimateTxFee(): Promise<TxFee> {

  // }

  public async mint(tokenAddress: string, amount: string): Promise<void> {
    const alice = this.keyring.addFromUri('//Alice');

    // @ts-ignore
    const { nonce } = await this.api.query.system.account(alice.address);
    await this.api.tx.sudo
      .sudo(
        this.api.tx.balances.setBalance(this.account.address, amount, '0')
      )
      .signAndSend(alice, { nonce });
  }
}
