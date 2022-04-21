
import '@polkadot/api-augment/substrate';

import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';

import { Client } from '../../networks/client';

export interface Config {
  rpcUrl: string;

  /** Transaction URL template with the transaction hash place marked as {{tx}} */
  transactionUrl: string;
}

export class PolkadotClient extends Client {
  keyring: Keyring;
  account: KeyringPair;
  api: ApiPromise;
  config: Config;

  public static async create(account: string, config: Config): Promise<PolkadotClient> {
    await cryptoWaitReady();
    const client = new PolkadotClient();
    client.keyring = new Keyring({ type: 'sr25519' });
    client.account = client.keyring.addFromUri(account);
    const wsProvider = new WsProvider(config.rpcUrl);
    client.api = await ApiPromise.create({ provider: wsProvider });
    client.transactionUrl = config.transactionUrl;

    return client;
  }

  public async getAddress(): Promise<string> {
    return this.account.address;
  }

  public async getPublicKey(): Promise<string> {
    return u8aToHex(this.account.publicKey, -1, false);
  }

  public async getBalance(): Promise<string> {
    // TODO: What to do with the reserved balance?
    // @ts-ignore
    const { data: { free } } = await this.api.query.system.account(this.account.address);

    return free.toString();
  }

  public async transfer(to: string, amount: string): Promise<void> {
    await this.api.tx.balances.transfer(to, amount)
      .signAndSend(this.account);
  }

  /**
   * Converts DOT to Planck.
   * @param amount in Ether
   */
  public toBaseUnit(amount: string): string {
    return amount; // FIXME: How to properly implement these methods? Use a configurable denominator?
  }

  /**
   * Converts Planck to DOT.
   * @param amount in Wei
   */
  public fromBaseUnit(amount: string): string {
    return amount; // FIXME:
  }

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

  /** Expects a hex string and returns a hex string */
  public async sign(data: string): Promise<string> {
    const message = hexToU8a(data);
    const signature = u8aToHex(this.account.sign(message), -1, false);

    return signature;
  }
}
