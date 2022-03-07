// import bs58 from 'bs58';
// import BN from 'bn.js';
// import { formatNearAmount, parseNearAmount } from 'near-api-js/lib/utils/format';
// import { KeyStore, InMemoryKeyStore } from 'near-api-js/lib/key_stores';
// import { JsonRpcProvider } from 'near-api-js/lib/providers';
// import { Client } from '@/networks/client';
// import { Transaction, TxFee, TxStatus } from '@/networks/transaction';
// import { Config } from './config';
// import { AccountCache } from './account';
// export class NearClient {
//   private keyStore: KeyStore;
//   private config: Config;
//   private lastTxTimestamps: number[] = [];
//   private rpc: JsonRpcProvider;
//   private accounts: AccountCache;
//   constructor() {
//     this.keyStore = new InMemoryKeyStore();
//   }
//   public getAddress(account: number): string {
//     const keypair = this.accounts.getOrCreate(this.mnemonic, account).keypair;
//     return Buffer.from(keypair.getPublicKey().data).toString('hex');
//   }
//   public async getBalance(accountIndex: number): Promise<string> {
//     const account = await this.accounts.getOrInit(this.mnemonic, accountIndex, this.config, this.keyStore);
//     const balance = await account.account!.getAccountBalance();
//     return balance.available;
//   }
//   /**
//    * @param to
//    * @param amount in yoctoNEAR
//    */
//   public async transfer(accountIndex: number, to: string, amount: string): Promise<void> {
//     const account = await this.accounts.getOrInit(this.mnemonic, accountIndex, this.config, this.keyStore);
//     await account.account!.sendMoney(to, new BN(amount));
//   }
//   public async getTransactions(accountIndex: number, limit?: number, offset?: number): Promise<Transaction[]> {
//     const url = new URL(`/account/${this.getAddress(accountIndex)}/activity`, this.config.explorerUrl);
//     if (limit) {
//       url.searchParams.append('limit', limit.toString());
//     }
//     if (offset) {
//       url.searchParams.append('offset', offset.toString());
//     }
//     const res = await fetch(url.toString());
//     const json = await res.json();
//     let txs: Transaction[] = [];
//     for (const action of json) {
//       // Convert timestamp to seconds since near presents it in nanoseconds
//       const timestamp = parseInt(action.block_timestamp) / 1000000;
//       if (action['action_kind'] == 'TRANSFER') {
//         txs.push({
//           status: TxStatus.Completed,
//           amount: action.args.deposit,
//           from: action.signer_id,
//           to: action.receiver_id,
//           timestamp: timestamp,
//           blockHash: action.block_hash,
//           hash: action.hash,
//         });
//       }
//     }
//     return txs;
//   }
//   private async fetchNewTransactions(account: number, limit: number, offset: number): Promise<Transaction[]> {
//     const txs = await this.getTransactions(account, limit, offset);
//     const txIdx = txs.findIndex(tx => tx.timestamp === this.lastTxTimestamps[account]);
//     if (txIdx == -1) {
//       const otherTxs = await this.fetchNewTransactions(account, limit, offset + limit);
//       txs.concat(otherTxs);
//       return txs;
//     } else if (txIdx > 0) {
//       return txs.slice(0, txIdx);
//     }
//     return [];
//   }
//   /**
//    * Convert human-readable NEAR to yoctoNEAR
//    **/
//   public toBaseUnit(amount: string): string {
//     return parseNearAmount(amount)!;
//   }
//   /**
//   * Convert yoctoNEAR to human-readable NEAR
//   **/
//   public fromBaseUnit(amount: string): string {
//     return formatNearAmount(amount);
//   }
//   public async estimateTxFee(): Promise<TxFee> {
//     const account = await this.accounts.getOrInit(this.mnemonic, 0, this.config, this.keyStore);
//     const status = await account.account!.connection.provider.status();
//     const latestBlock = status.sync_info.latest_block_hash;
//     const res = await this.rpc.gasPrice(latestBlock);
//     const gasPrice = new BN(res.gas_price);
//     const gas = new BN('30000000000000');
//     const fee = gas.mul(gasPrice).toString();
//     const feeFormatted = formatNearAmount(fee);
//     return {
//       gas: gas.toString(),
//       gasPrice: gasPrice.toString(),
//       fee: feeFormatted,
//     };
//   }
//   public getNetworkType(): NetworkType {
//     return NetworkType.near;
//   }
// }
//# sourceMappingURL=client.js.map