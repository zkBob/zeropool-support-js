import { Observable } from 'rxjs';
import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { Config } from './config';
import { Transaction, TxFee } from '../transaction';

export class WavesCoin extends Coin {
  private mnemonic: string;
  private config: Config;

  constructor(mnemonic: string, config: Config) {
    super();
    this.mnemonic = mnemonic;
    this.config = config;
  }

  getPrivateKey(account: number): string {
    return 'TODO';
  }
  getPublicKey(account: number): string {
    return 'TODO';
  }
  getAddress(account: number): string {
    return 'TODO';
  }
  async getBalance(account: number): Promise<string> {
    return '0';
  }
  transfer(account: number, to: string, amount: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  getTransactions(account: number, limit?: number, offset?: number): Promise<Transaction[]> {
    throw new Error('Method not implemented.');
  }
  subscribe(account: number): Promise<Observable<Transaction>> {
    throw new Error('Method not implemented.');
  }
  toBaseUnit(amount: string): string {
    throw new Error('Method not implemented.');
  }
  fromBaseUnit(amount: string): string {
    throw new Error('Method not implemented.');
  }
  estimateTxFee(): Promise<TxFee> {
    throw new Error('Method not implemented.');
  }

  public getCoinType(): CoinType {
    return CoinType.waves;
  }
}
