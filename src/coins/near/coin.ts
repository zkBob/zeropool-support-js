import bs58 from 'bs58';
import BN from 'bn.js';


import { Observable } from 'rxjs';
import { formatNearAmount, parseNearAmount } from 'near-api-js/lib/utils/format';

import { KeyStore, InMemoryKeyStore } from 'near-api-js/lib/key_stores';
import { JsonRpcProvider } from 'near-api-js/lib/providers';

import { Coin } from '../coin';
import { Config } from './config';
import { Transaction, TxFee, TxStatus } from '../transaction';
import { AccountCache } from './account';
import { CoinType } from '../coin-type';

const POLL_INTERVAL = 10 * 60 * 1000;
const TX_LIMIT = 10;


export class NearCoin extends Coin {
  private keyStore: KeyStore;
  private config: Config;
  private lastTxTimestamps: number[] = [];
  private rpc: JsonRpcProvider;
  private accounts: AccountCache;

  constructor(mnemonic: string, config: Config) {
    super(mnemonic);
    this.mnemonic = mnemonic;
    this.keyStore = new InMemoryKeyStore();
    this.config = config;
    this.accounts = new AccountCache();
    this.rpc = new JsonRpcProvider(this.config.nodeUrl);
  }

  public getPrivateKey(account: number): string {
    const keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
    return 'ed25519:' + bs58.encode(keypair.secretKey);
  }

  public getPublicKey(account: number): string {
    const keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
    return 'ed25519:' + bs58.encode(keypair.getPublicKey().data);
  }

  public getAddress(account: number): string {
    const keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
    return Buffer.from(keypair.getPublicKey().data).toString('hex');
  }

  public async getBalance(accountIndex: number): Promise<string> {
    const account = await this.accounts.getOrInit(this.mnemonic, accountIndex, this.config, this.keyStore);
    const balance = await account.account!.getAccountBalance();

    return balance.available;
  }

  /**
   * @param to
   * @param amount in yoctoNEAR
   */
  public async transfer(accountIndex: number, to: string, amount: string) {
    const account = await this.accounts.getOrInit(this.mnemonic, accountIndex, this.config, this.keyStore);
    await account.account!.sendMoney(to, new BN(amount));
  }

  public async getTransactions(accountIndex: number, limit?: number, offset?: number): Promise<Transaction[]> {
    const url = new URL(`/account/${this.getAddress(accountIndex)}/activity`, this.config.explorerUrl);

    if (limit) {
      url.searchParams.append('limit', limit.toString());
    }

    if (offset) {
      url.searchParams.append('offset', offset.toString());
    }

    const res = await fetch(url.toString());
    const json = await res.json();

    let txs: Transaction[] = [];

    for (const action of json) {
      // Convert timestamp to seconds since near presents it in nanoseconds
      const timestamp = parseInt(action.block_timestamp) / 1000000;
      if (action['action_kind'] == 'TRANSFER') {
        txs.push({
          status: TxStatus.Completed,
          amount: action.args.deposit,
          from: action.signer_id,
          to: action.receiver_id,
          timestamp: timestamp,
          blockHash: action.block_hash,
          hash: action.hash,
        });
      }
    }

    return txs;
  }

  public async subscribe(account: number): Promise<Observable<Transaction>> { // FIXME: Use account index
    const latestTxs = await this.getTransactions(1);

    if (latestTxs.length == 1) {
      this.lastTxTimestamps[account] = latestTxs[0].timestamp;
    }

    return new Observable(subscriber => {
      const interval = setInterval(async () => {
        try {
          const txs = await this.fetchNewTransactions(account, TX_LIMIT, 0);

          for (const tx of txs) {
            subscriber.next(tx);
          }
        } catch (e) {
          subscriber.error(e);
        }
      }, POLL_INTERVAL);

      return function unsubscribe() {
        clearInterval(interval);
      }
    });
  }

  private async fetchNewTransactions(account: number, limit: number, offset: number): Promise<Transaction[]> {
    const txs = await this.getTransactions(account, limit, offset);
    const txIdx = txs.findIndex(tx => tx.timestamp === this.lastTxTimestamps[account]);

    if (txIdx == -1) {
      const otherTxs = await this.fetchNewTransactions(account, limit, offset + limit);
      txs.concat(otherTxs);
      return txs;
    } else if (txIdx > 0) {
      return txs.slice(0, txIdx);
    }

    return [];
  }

  /**
   * Convert human-readable NEAR to yoctoNEAR
   **/
  public toBaseUnit(amount: string): string {
    return parseNearAmount(amount)!;
  }

  /**
  * Convert yoctoNEAR to human-readable NEAR
  **/
  public fromBaseUnit(amount: string): string {
    return formatNearAmount(amount);
  }

  public async estimateTxFee(): Promise<TxFee> {
    const account = await this.accounts.getOrInit(this.mnemonic, 0, this.config, this.keyStore);
    const status = await account.account!.connection.provider.status();
    const latestBlock = status.sync_info.latest_block_hash;

    const res = (await this.rpc.sendJsonRpc('gas_price', [latestBlock])).gas_price;

    const gasPrice = new BN(res);
    const gas = new BN('30000000000000'); // FIXME
    const fee = gas.mul(gasPrice).toString();
    const feeFormatted = formatNearAmount(fee);

    return {
      gas: gas.toString(),
      gasPrice: gasPrice.toString(),
      fee: feeFormatted,
    };
  }

  public getCoinType(): CoinType {
    return CoinType.near;
  }
}
