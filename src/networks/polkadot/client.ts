
import '@polkadot/api-augment/substrate';

// import { TxFee } from '@/networks/transaction';
import { Client } from '../../networks/client';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { stringToU8a, u8aToHex } from '@polkadot/util';
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

  public async getAddress(): Promise<string> {
    return this.account.address;
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

  public async sign(data: string): Promise<string> {
    const message = stringToU8a(data);
    const signature = u8aToHex(this.account.sign(message));

    return signature;
  }
}
