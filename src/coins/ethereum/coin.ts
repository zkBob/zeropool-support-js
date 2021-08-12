import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import { Observable } from 'rxjs';
import BN from 'bn.js';
import bs64 from 'base64-js';

import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { Transaction, TxFee, TxStatus } from '../transaction';
import { convertTransaction } from './utils';
import { Config } from './config';
import { LocalTxStorage } from './storage';
import { AccountCache } from './account';
import contract from './Pool.json';
import { Output } from 'libzeropool-rs-wasm-bundler';

const TX_CHECK_INTERVAL = 10 * 1000;
const TX_STORAGE_PREFIX = 'zeropool.eth-txs';
const MAX_SCAN_TASKS = 100;
const ABI = contract.abi as AbiItem[];

export class EthereumCoin extends Coin {
  private web3: Web3;
  private web3ws: Web3;
  private txStorage: LocalTxStorage;
  private accounts: AccountCache;
  private contract: Contract;
  private config: Config;

  constructor(mnemonic: string, config: Config) {
    super(mnemonic);
    this.web3 = new Web3(config.httpProviderUrl);
    this.web3ws = new Web3(config.wsProviderUrl);
    this.txStorage = new LocalTxStorage(TX_STORAGE_PREFIX);
    this.accounts = new AccountCache(mnemonic, this.web3);
    this.contract = new this.web3.eth.Contract(ABI, config.contractAddress);
    this.config = config;
  }

  public async init() {
    await super.init();
    // await this.fetchNotes();
  }

  public getPrivateKey(account: number): string {
    return this.accounts.getOrCreate(account).account.privateKey;
  }

  public getPublicKey(account: number): string {
    return this.accounts.getOrCreate(account).keypair.publicKey.toString('hex');
  }

  public getAddress(account: number): string {
    return this.accounts.getOrCreate(account).account.address;
  }

  public async getBalance(account: number): Promise<string> {
    return await this.web3.eth.getBalance(this.getAddress(account));
  }

  public async transfer(account: number, to: string, amount: string) {
    const from = this.getAddress(account);
    const nonce = await this.web3.eth.getTransactionCount(this.getAddress(account));
    const gas = await this.web3.eth.estimateGas({ from, to, value: amount });
    const gasPrice = await this.web3.eth.getGasPrice();
    const signed = await this.web3.eth.accounts.signTransaction({
      from,
      to,
      value: amount,
      nonce,
      gas,
      gasPrice,
    }, this.getPrivateKey(account))

    const receipt = await this.web3.eth.sendSignedTransaction(signed.rawTransaction!);
    const block = await this.web3.eth.getBlock(receipt.blockNumber);

    let timestamp;
    if (typeof block.timestamp == 'string') {
      timestamp = parseInt(block.timestamp);
    } else {
      timestamp = block.timestamp;
    }

    let status = TxStatus.Completed;
    if (!receipt.status) {
      status = TxStatus.Error;
    }

    const nativeTx = await this.web3.eth.getTransaction(receipt.transactionHash);
    const tx = convertTransaction(nativeTx, timestamp, status);

    this.txStorage.add(this.getAddress(account), tx);
  }

  public async getTransactions(account: number, limit: number, offset: number): Promise<Transaction[]> {
    const numTx = await this.web3.eth.getTransactionCount(this.getAddress(account));

    if (numTx === 0) {
      return [];
    }

    const txs = this.txStorage.list(this.getAddress(account));
    return txs.slice(offset, offset + limit);
  }

  public async subscribe(account: number): Promise<Observable<Transaction>> {
    const web3 = this.web3;
    const sub = this.web3ws.eth.subscribe('pendingTransactions');
    const address = this.getAddress(account);

    const obs: Observable<Transaction> = new Observable(subscriber => {
      sub.on('data', async txHash => {
        let nativeTx = await web3.eth.getTransaction(txHash);

        if ((nativeTx.to && nativeTx.to.toLowerCase() != address) && nativeTx.from.toLowerCase() != address) {
          return;
        }

        // Periodically check status of the transaction
        const interval = setInterval(async () => {
          try {
            nativeTx = await web3.eth.getTransaction(txHash);
          } catch (e) {
            clearInterval(interval);
          }

          if (nativeTx.transactionIndex !== null) {
            const block = await web3.eth.getBlock(nativeTx.blockNumber!);

            let timestamp;
            if (typeof block.timestamp == 'string') {
              timestamp = parseInt(block.timestamp);
            } else {
              timestamp = block.timestamp;
            }

            const tx = convertTransaction(nativeTx, timestamp);

            // Relevant transaction found, update tx cache and notify listeners
            this.txStorage.add(this.getAddress(account), tx);
            subscriber.next(tx);

            clearInterval(interval);
          }
        }, TX_CHECK_INTERVAL); // TODO: What's the optimal interval for this?
      })
        .on('error', error => {
          subscriber.error(error);
        });

      return function unsubscribe() {
        sub.unsubscribe();
      }
    });

    return obs;
  }

  /**
   * Converts ether to Wei.
   * @param amount in Ether
   */
  public toBaseUnit(amount: string): string {
    return this.web3.utils.toWei(amount, 'ether');
  }

  /**
   * Converts Wei to ether.
   * @param amount in Wei
   */
  public fromBaseUnit(amount: string): string {
    return this.web3.utils.fromWei(amount, 'ether');
  }

  public async estimateTxFee(): Promise<TxFee> {
    const gas = await this.web3.eth.estimateGas({
      from: this.getAddress(0),
      to: this.getAddress(0),
      value: this.toBaseUnit('1'),
    });
    const gasPrice = await this.web3.eth.getGasPrice();
    const fee = new BN(gas).mul(new BN(gasPrice));

    return {
      gas: gas.toString(),
      gasPrice,
      fee: this.fromBaseUnit(fee.toString()),
    };
  }

  public getCoinType(): CoinType {
    return CoinType.ethereum;
  }

  public async transferPrivate(account: number, outputs: Output[]): Promise<void> {
    // await this.fetchNotes();

    // const address = this.getAddress(0);
    // const newPrivateAddress = this.privateAccount.generateAddress();

    // // Check balance
    // const totalOut = outputs.reduce((acc, cur) => {
    //   const amount = BigInt(cur.amount);
    //   return acc + amount;
    // }, BigInt(0));

    // const curBalance = BigInt(await this.getBalance(account));

    // if (totalOut > curBalance) {
    //   throw new Error('Cannot transfer more than you have');
    // }

    // // TODO: Check if there needs to be a merge

    // // Create a transaction
    // const txData = await this.privateAccount.createTx(outputs);

    // // TODO: Check 
    // // await this.contract.methods.transact().send({ from: address });

    // const privateBalance = BigInt(this.getPrivateBalance());
    // if (privateBalance < totalOut) {
    //   const selector = Pool.interface.getSighash("transact"); // FIXME: Use ABI
    //   const nullifier = txData.public.nullifier;
    //   const out_commit = txData.public.out_commit;
    //   const transfer_index = "000000000000";
    //   const enery_amount = "0000000000000000000000000000";
    //   const token_amount = "0000000000000000";
    //   const transact_proof = rand_fr_hex_list(8);
    //   const root_after = rand_fr_hex();
    //   const tree_proof = rand_fr_hex_list(8);
    //   const tx_type = "01"; // transaction
    //   const memo_size = "30"; // memo block size
    //   const memo_fee = "0000000000000000"; // here is smart contract level metadata, only fee for 01 type
    //   const memo_message = rand_bigint_hex(parseInt(memo_size, 16) - memo_fee.length / 2); //here is encrypted tx metadata, used on client only

    //   const data = [
    //     selector, nullifier, out_commit, transfer_index, enery_amount, token_amount, transact_proof,
    //     root_after, tree_proof,
    //     tx_type,
    //     memo_size, memo_fee, memo_message
    //   ].join("");

    //   await this.web3.eth.call({
    //     from: address,
    //     to: this.config.contractAddress,
    //     data: '',
    //     value: (totalOut - privateBalance).toString(),
    //   })
    // }

    // await this.web3.eth.call({
    //   from: address,
    //   to: this.config.contractAddress,
    //   data: '',
    // })
    console.log('TODO')
  }

  public getPrivateBalance(): string {
    return this.privateAccount.totalBalance();
  }

  private async fetchNotes() {
    const sk = this.getPrivateSpendingKey();
    const events = await this.contract.getPastEvents('allEvents', {
      fromBlock: this.config.contractBlock,
      toBlock: 'latest'
    });

    for (const event of events) {
      const message = event.raw.data;
      const data = bs64.toByteArray(message);

      try {
        const pair = this.privateAccount.decryptPair(data);

        if (pair) {
          // TODO: Update account if needed
          // Store account

          // this.privateAccount.addAccount();
        } else {
          const note = this.privateAccount.decryptNotes(data);
          // this.privateAccount.addReceivedNote();

          if (!note) {
            continue;
          }

          // TODO: Store note
        }

      } catch (e) {
        continue;
      }
    }
  }

  /**
   * Scans blocks for account transactions (both from and to).
   * @param startBlockNumber
   * @param endBlockNumber
   * @param batchSize maximum number of parallel scans
   */
  private async fetchAccountTransactions(account: number, startBlockNumber: number, endBlockNumber: number, batchSize: number = MAX_SCAN_TASKS): Promise<Transaction[]> {
    if (endBlockNumber > startBlockNumber) {
      throw new Error('startBlockNumber must be higher than endBlockNumber');
    }

    const address = this.getAddress(account);
    let transactions: Transaction[] = [];

    for (let batch = 0; batch < startBlockNumber - endBlockNumber; batch += batchSize) {
      let promises: Promise<Transaction[]>[] = [];
      for (let currentBlock = startBlockNumber - batch * batchSize; currentBlock >= endBlockNumber - batch * batchSize; --currentBlock) {
        promises.push(this.scanBlock(address, currentBlock));
      }

      const results = await Promise.all(promises);
      for (let txs of results) {
        transactions.push(...txs);
      }
    }

    return transactions;
  }

  /**
   * Scan block for account transactions.
   * @param address
   * @param blockNumber
   */
  private async scanBlock(address: string, blockNumber: number): Promise<Transaction[]> {
    let transactions: Transaction[] = [];

    const block = await this.web3.eth.getBlock(blockNumber, true);
    if (block != null && block.transactions != null) {
      for (const tx of block.transactions) {
        if (address == tx.from || address == tx.to) {
          const timestamp = (typeof block.timestamp == 'string') ? parseInt(block.timestamp) : block.timestamp;
          const newTx = convertTransaction(tx, timestamp);
          transactions.push(newTx);
        }
      }
    }

    return transactions;
  }
}
