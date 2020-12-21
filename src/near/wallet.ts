import { CoinType } from '@trustwallet/wallet-core';
import { Wallet } from '../wallet';
import { NearClient } from './client';
import { Environment } from './config';

export class NearWallet implements Wallet {
  client: NearClient;

  constructor(env: Environment) {
    this.client = new NearClient(env);
  }

  getPrivateKey(): string {
    throw new Error('Method not implemented.');
  }

  getPublicKey(): string {
    throw new Error('Method not implemented.');
  }

  getAddress(): string {
    throw new Error('Method not implemented.');
  }

  async getBalance(): Promise<string> {
    const balance = await this.client.getNearBalance();

    // TODO: temporary
    return JSON.stringify(balance);
  }

  async transfer(from: string, to: string, amount: string) {
    await this.client.transferNear(to, amount);
  }

  coinType(): CoinType {
    return CoinType.near;
  }
}
