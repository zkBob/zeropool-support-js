import { CoinType } from '@trustwallet/wallet-core';
import { Coin } from '../coin';
import { Environment } from './config';
import { NearClient } from './client';
import { parseSeedPhrase } from '../../utils';
import bs58 from 'bs58';

const PATH = `m/44'/${CoinType.near}'/0'`;

export class NearCoin implements Coin {
  private seed: string;
  private client: NearClient;

  constructor(env: Environment, seed: string) {
    this.seed = seed;
    this.client = new NearClient(env, this.getAddress(), this.getPrivateKey());
  }

  getPrivateKey(): string {
    const pair = parseSeedPhrase(this.seed, PATH);
    const secretKey = 'ed25519:' + bs58.encode(Buffer.from(pair.secretKey));

    return secretKey;
  }

  getPublicKey(): string {
    const pair = parseSeedPhrase(this.seed, PATH);
    const publicKey = 'ed25519:' + bs58.encode(Buffer.from(pair.publicKey));

    return publicKey;
  }

  getAddress(): string {
    const pair = parseSeedPhrase(this.seed, PATH);
    const address = Buffer.from(pair.publicKey).toString('hex');

    return address;
  }

  async getBalance(): Promise<string> {
    const balance = await this.client.getBalance();
    return balance.available;
  }

  async transfer(to: string, amount: string) {
    await this.client.transfer(to, amount);
  }

  coinType(): CoinType {
    return CoinType.near;
  }
}
