import bs58 from 'bs58';
import BN from 'bn.js';
import { Observable } from 'rxjs';
import { formatNearAmount, parseNearAmount } from 'near-api-js/lib/utils/format';
import { Account, KeyPair, connect } from 'near-api-js';
import { KeyStore, InMemoryKeyStore } from 'near-api-js/lib/key_stores';
import { JsonRpcProvider } from 'near-api-js/lib/providers';

import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { Config } from './config';
import { parseMnemonic, HDKey } from '../../utils';
import { Transaction, TxFee, TxStatus } from '../transaction';

const POLL_INTERVAL = 10 * 60 * 1000;
const TX_LIMIT = 10;

export class NearCoin implements Coin {
  private keyStore: KeyStore;
  public account: Account;
  private keypair: HDKey;
  private config: Config;
  private lastTxTimestamp: number = 0;
  private rpc: JsonRpcProvider;

  constructor(seed: string, config: Config, account: number) {
    this.keyStore = new InMemoryKeyStore();
    this.keypair = parseMnemonic(seed, CoinType.near, account);
    this.config = config;
  }

  public getPrivateKey(): string {
    return 'ed25519:' + bs58.encode(this.keypair.privateKey);
  }

  public getPublicKey(): string {
    return 'ed25519:' + bs58.encode(Buffer.from(this.keypair.publicKey));
  }

  public getAddress(): string {
    return Buffer.from(this.keypair.publicKey).toString('hex');
  }

  public async getBalance(): Promise<string> {
    await this.ensureAccount();
    const balance = await this.account.getAccountBalance();
    return balance.available;
  }

  /**
   * @param to
   * @param amount in yoctoNEAR
   */
  public async transfer(to: string, amount: string) {
    await this.ensureAccount();
    await this.account.sendMoney(to, new BN(amount));
  }

  public async getTransactions(limit?: number, offset?: number): Promise<Transaction[]> {
    await this.ensureAccount();

    const url = new URL(`/account/${this.getAddress()}/activity`, this.config.explorerUrl);

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

  public async subscribe(): Promise<Observable<Transaction>> {
    await this.ensureAccount();

    const latestTxs = await this.getTransactions(1);

    if (latestTxs.length == 1) {
      this.lastTxTimestamp = latestTxs[0].timestamp;
    }

    return new Observable(subscriber => {
      const interval = setInterval(async () => {
        try {
          const txs = await this.fetchNewTransactions(TX_LIMIT, 0);

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

  private async fetchNewTransactions(limit: number, offset: number): Promise<Transaction[]> {
    const txs = await this.getTransactions(limit, offset);
    const txIdx = txs.findIndex(tx => tx.timestamp === this.lastTxTimestamp);

    if (txIdx == -1) {
      const otherTxs = await this.fetchNewTransactions(limit, offset + limit);
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
    const status = await this.account.connection.provider.status();
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

  private async init(): Promise<void> {
    await this.keyStore.setKey(
      this.config.networkId,
      this.getAddress(),
      KeyPair.fromString('ED25519:' + this.keypair.privateKey)
    );

    const options = { ...this.config, deps: { keyStore: this.keyStore } };
    const near = await connect(options);

    this.account = await near.account(this.getAddress());
    this.rpc = new JsonRpcProvider(this.config.nodeUrl);
  }

  private async ensureAccount(): Promise<void> {
    if (!this.account) {
      await this.init();
    }
  }
}
