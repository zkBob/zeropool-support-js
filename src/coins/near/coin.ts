import { CoinType } from '@trustwallet/wallet-core';
import bs58 from 'bs58';
import { Observable } from 'rxjs';
import { formatNearAmount, parseNearAmount } from 'near-api-js/lib/utils/format';

import { Coin } from '../coin';
import { Config } from './config';
import { NearClient } from './client';
import { parseSeedPhrase, SignKeyPair } from '../../utils';
import { Transaction } from '../transaction';

export class NearCoin implements Coin {
  private client: NearClient;
  private keypair: SignKeyPair;

  constructor(seed: string, config: Config) {
    this.client = new NearClient(config, this.getAddress(), this.getPrivateKey());
    this.keypair = parseSeedPhrase(seed, CoinType.derivationPath(CoinType.near));
  }

  getPrivateKey(): string {
    return 'ed25519:' + bs58.encode(Buffer.from(this.keypair.secretKey));
  }

  getPublicKey(): string {
    return 'ed25519:' + bs58.encode(Buffer.from(this.keypair.publicKey));
  }

  getAddress(): string {
    return Buffer.from(this.keypair.publicKey).toString('hex');
  }

  async getBalance(): Promise<string> {
    const balance = await this.client.getBalance();
    return balance.available;
  }

  /**
   * Transfer NEAR
   * @param to
   * @param amount in yoctoNEAR
   */
  async transfer(to: string, amount: string) {
    await this.client.transfer(to, amount);
  }

  coinType(): CoinType {
    return CoinType.near;
  }

  getTransactions(from: number, to: number): Promise<Transaction[]> {
    throw new Error('Method not implemented.');
  }

  subscribe(): Observable<Transaction> {
    throw new Error('Method not implemented.');
  }

  /**
   * Convert human-readable NEAR to yoctoNEAR
   **/
  toBaseUnit(amount: string): string {
    return parseNearAmount(amount)!;
  }

  /**
  * Convert yoctoNEAR to human-readable NEAR
  **/
  fromBaseUnit(amount: string): string {
    return formatNearAmount(amount);
  }
}
