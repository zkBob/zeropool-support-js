// import { nodeInteraction, broadcast, transfer } from "@waves/waves-transactions";
// import { create } from '@waves/node-api-js';
// import { Client } from '@/networks/client';
// import { NetworkType } from '@/networks/network-type';
// import { Transaction, TxFee, TxStatus } from '@/networks/transaction';
// import { Config } from './config';
// import { AccountCache } from './account';
// import { ZeroPoolState } from "@/state";
// export class WavesNetwork extends Client {
//   private config: Config;
//   private accounts: AccountCache;
//   private api: ReturnType<typeof create>;
//   private lastTxTimestamps: number[] = [];
//   constructor(mnemonic: string, config: Config, state: ZeroPoolState, worker: any) {
//     this.config = config;
//     this.api = create(config.nodeUrl);
//     this.accounts = new AccountCache(mnemonic, config.chainId);
//   }
//   getPrivateKey(account: number): string {
//     return this.accounts.getOrCreate(account).privateKey;
//   }
//   getPublicKey(account: number): string {
//     return this.accounts.getOrCreate(account).publicKey;
//   }
//   getAddress(account: number): string {
//     return this.accounts.getOrCreate(account).address;
//   }
//   async getBalance(account: number): Promise<string> {
//     const balance = await nodeInteraction.balance(this.getAddress(account), this.config.nodeUrl);
//     return balance.toString();
//   }
//   async transfer(account: number, to: string, amount: string): Promise<void> {
//     const txParams = {
//       recipient: to,
//       amount,
//     }
//     const transferTx = transfer(txParams, { privateKey: this.getPrivateKey(account) });
//     await broadcast(transferTx, this.config.nodeUrl);
//   }
//   async getTransactions(account: number, limit: number = 10, offset: number = 0): Promise<Transaction[]> {
//     const address = this.getAddress(account);
//     // TODO: Find a more efficient way to fetch the transaction log with an offset
//     let txList = await this.api.transactions.fetchTransactions(address, offset + limit);
//     return txList.slice(offset, offset + limit).map((transaction) => {
//       const tx = transaction as any; // FIXME: type handling, there are multiple types of tx
//       let to, from;
//       if (tx.recipient) {
//         to = tx.recipient;
//         from = tx.sender;
//       } else if (tx.sender === address) {
//         to = tx.sender;
//         from = address;
//       } else {
//         to = address;
//         from = tx.sender;
//       }
//       return {
//         hash: tx.id,
//         blockHash: '', // FIXME
//         status: TxStatus.Completed, // FIXME: get tx status
//         amount: tx.amount,
//         from,
//         to,
//         timestamp: tx.timestamp,
//       };
//     });
//   }
//   toBaseUnit(amount: string): string {
//     return (parseFloat(amount) * 10000000).toString();
//   }
//   fromBaseUnit(amount: string): string {
//     return (parseInt(amount) / 10000000).toString();
//   }
//   // TODO: Estimate fee for private transactions
//   async estimateTxFee(): Promise<TxFee> {
//     return {
//       gas: '1',
//       gasPrice: '100000',
//       fee: '100000',
//     };
//   }
//   public getNetworkType(): NetworkType {
//     return NetworkType.waves;
//   }
// }
//# sourceMappingURL=client.js.map