import bs58 from 'bs58';
import bip39 from 'bip39-light';
import BN from 'bn.js';
import { derivePath } from 'ed25519-hd-key';
import { sign } from 'tweetnacl';;

import { Observable } from 'rxjs';
import { formatNearAmount, parseNearAmount } from 'near-api-js/lib/utils/format';
import { Account, connect } from 'near-api-js';
import { KeyPairEd25519 } from 'near-api-js/lib/utils/key_pair';
import { KeyStore, InMemoryKeyStore } from 'near-api-js/lib/key_stores';
import { JsonRpcProvider } from 'near-api-js/lib/providers';

import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { Config } from './config';
import { preprocessMnemonic } from '../../utils';
import { Transaction, TxFee, TxStatus } from '../transaction';

const POLL_INTERVAL = 10 * 60 * 1000;
const TX_LIMIT = 10;

export class NearCoin implements Coin {
  private keyStore: KeyStore;
  public account: Account;
  private keypair: KeyPairEd25519;
  private config: Config;
  private lastTxTimestamp: number = 0;
  private rpc: JsonRpcProvider;

  constructor(mnemonic: string, config: Config, account: number) {
    this.keyStore = new InMemoryKeyStore();

    this.config = config;

    const processed = preprocessMnemonic(mnemonic);
    const path = CoinType.derivationPath(CoinType.near, account);
    const seed = bip39.mnemonicToSeed(processed);
    const { key } = derivePath(path, seed.toString('hex'));
    const naclKeypair = sign.keyPair.fromSeed(key);
    const privateKey = bs58.encode(Buffer.from(naclKeypair.secretKey));

    this.keypair = KeyPairEd25519.fromString(privateKey) as KeyPairEd25519;
  }

  public getPrivateKey(): string {
    return 'ed25519:' + bs58.encode(this.keypair.secretKey);
  }

  public getPublicKey(): string {
    return 'ed25519:' + bs58.encode(this.keypair.getPublicKey().data);
  }

  public getAddress(): string {
    return Buffer.from(this.keypair.getPublicKey().data).toString('hex');
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
      this.keypair,
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
