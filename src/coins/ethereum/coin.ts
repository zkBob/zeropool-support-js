import Web3 from 'web3';
import { Observable } from 'rxjs';
import BN from 'bn.js';
import { Note, Output, Params } from 'libzeropool-rs-wasm-bundler';
import { TransactionConfig } from 'web3-core';
import { Contract } from 'web3-eth-contract';


import { Coin } from '../coin';
import { CoinType } from '../coin-type';
import { Transaction, TxFee, TxStatus } from '../transaction';
import { CONSTANTS, convertTransaction, toCompactSignature } from './utils';
import { Config } from './config';
import { LocalTxStorage } from './storage';
import { AccountCache } from './account';
import { EthPrivateTransaction, TxType, txTypeToString } from './private-tx';
import { hexToBuf, toTwosComplementHex, HexStringReader } from '../../utils';
import { AbiItem, hexToBytes } from 'web3-utils';
import { SnarkParams } from '../../config';
import { ZeroPoolBackend } from '../../zp/backend';
import { DirectBackend } from './backends/direct';

// TODO: Organize presistent state properly

const TX_CHECK_INTERVAL = 10 * 1000;
const TX_STORAGE_PREFIX = 'zeropool.eth-txs';
const STATE_STORAGE_PREFIX = 'zeropool.eth.state';

export class EthereumCoin extends Coin {
  private web3: Web3;
  // private web3ws: Web3;
  private txStorage: LocalTxStorage;
  private accounts: AccountCache;
  private config: Config;
  private backend: DirectBackend;

  constructor(mnemonic: string, web3: Web3, config: Config, backend: DirectBackend) {
    super(mnemonic);
    this.web3 = web3;
    // this.web3ws = new Web3(config.wsProviderUrl);
    this.txStorage = new LocalTxStorage(TX_STORAGE_PREFIX);
    this.accounts = new AccountCache(mnemonic, this.web3);
    this.config = config;
    this.backend = backend;
  }

  protected async init() {
    await super.init();
    await this.updatePrivateState();
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
    // const web3 = this.web3;
    // const sub = this.web3ws.eth.subscribe('pendingTransactions');
    // const address = this.getAddress(account);

    const obs: Observable<Transaction> = new Observable(subscriber => {
      // sub.on('data', async txHash => {
      //   let nativeTx = await web3.eth.getTransaction(txHash);

      //   if ((nativeTx.to && nativeTx.to.toLowerCase() != address) && nativeTx.from.toLowerCase() != address) {
      //     return;
      //   }

      //   // Periodically check status of the transaction
      //   const interval = setInterval(async () => {
      //     try {
      //       nativeTx = await web3.eth.getTransaction(txHash);
      //     } catch (e) {
      //       clearInterval(interval);
      //     }

      //     if (nativeTx.transactionIndex !== null) {
      //       const block = await web3.eth.getBlock(nativeTx.blockNumber!);

      //       let timestamp;
      //       if (typeof block.timestamp == 'string') {
      //         timestamp = parseInt(block.timestamp);
      //       } else {
      //         timestamp = block.timestamp;
      //       }

      //       const tx = convertTransaction(nativeTx, timestamp);

      //       // Relevant transaction found, update tx cache and notify listeners
      //       this.txStorage.add(this.getAddress(account), tx);
      //       subscriber.next(tx);

      //       clearInterval(interval);
      //     }
      //   }, TX_CHECK_INTERVAL); // TODO: What's the optimal interval for this?
      // })
      //   .on('error', error => {
      //     subscriber.error(error);
      //   });

      // return function unsubscribe() {
      //   sub.unsubscribe();
      // }
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

  // deposit
  // transfer
  /**
   * coin.transferPublicToPrivate(0, [{ to: 'addr', amount: '123' }])
   * @param account 
   * @param outputs 
   */
  public async transferPublicToPrivate(account: number, outputs: Output[]): Promise<void> {
    await this.updatePrivateState();

    // Check balance
    const totalOut = outputs.reduce((acc, cur) => {
      const amount = BigInt(cur.amount);
      return acc + amount;
    }, BigInt(0));

    const curBalance = BigInt(await this.getBalance(account));

    if (totalOut > curBalance) {
      throw new Error('Insufficient balance');
    }

    // TODO: Merge unspent notes?
    // await this.mergePrivate();

    // Deposit if needed
    const privateBalance = BigInt(this.getPrivateBalance());
    if (privateBalance < totalOut) {
      await this.depositPrivate(account, (totalOut - privateBalance).toString());
    }

    // Transfer
    await this.transferPrivateToPrivate(account, outputs);
  }

  public async transferPrivateToPrivate(account: number, outs: Output[]): Promise<void> {
    const privateKey = this.getPrivateKey(account);
    return this.backend.transfer(privateKey, outs);
  }

  public async depositPrivate(account: number, amount: string): Promise<void> {
    const privateKey = this.getPrivateKey(account);
    return this.backend.deposit(privateKey, amount);
  }

  public async withdrawPrivate(account: number, amount: string): Promise<void> {
    const privateKey = this.getPrivateKey(account);
    return this.backend.withdraw(privateKey, amount);
  }

  public getPrivateBalance(): string {
    return this.backend.getTotalBalance();
  }

  public getPrivateBalances(): [string, string, string] {
    return this.backend.getBalances();
  }

  public async updatePrivateState(): Promise<void> {
    const STORAGE_PREFIX = `${STATE_STORAGE_PREFIX}.latestCheckedBlock`;

    const curBlockNumber = await this.web3.eth.getBlockNumber();
    const latestCheckedBlock = Number(localStorage.getItem(STORAGE_PREFIX)) || this.config.contractBlock;

    // moslty useful for local testing, since getPastLogs always returns at least one latest event
    if (curBlockNumber === latestCheckedBlock) {
      return;
    }

    // TODO: How to paginate?
    const logs = await this.web3.eth.getPastLogs({ fromBlock: latestCheckedBlock + 1, address: this.config.contractAddress });

    console.log('Contract logs', logs);

    // TODO: Batch getTransaction
    let newLatestBlock = latestCheckedBlock;
    for (const log of logs) {
      const tx = await this.web3.eth.getTransaction(log.transactionHash);
      const message = tx.input;
      newLatestBlock = tx.blockNumber!;

      this.cachePrivateTx(message);
    }

    localStorage.setItem(STORAGE_PREFIX, newLatestBlock.toString());
  }


  /**
   * Attempt to extract and save usable account/notes from transaction data.
   * @param raw hex-encoded transaction data
   */
  private cachePrivateTx(raw: string) {
    const txData = EthPrivateTransaction.decode(raw);
    const ciphertext = hexToBuf(txData.ciphertext);
    const pair = this.privateAccount.decryptPair(ciphertext);
    const onlyNotes = this.privateAccount.decryptNotes(ciphertext);

    const reader = new HexStringReader(txData.ciphertext);
    const numItems = reader.readNumber(4, true);
    const hashes = reader.readBigIntArray(numItems, 32, true).map(num => num.toString());
    if (hashes.length < CONSTANTS.OUT + 1) {
      const zeroes = Array(CONSTANTS.OUT + 1 - hashes.length).fill('0');
      hashes.push(...zeroes);
    }

    console.log('Updating state', this.privateAccount.getWholeState());

    function isZeroNote({ p_d }: {
      d: string,
      p_d: string,
      b: string,
      t: string
    }) {
      return p_d == '0';
    }

    if (pair) {
      const notes = pair.notes.reduce<{ note: Note, index: number }[]>((acc, note, index) => {
        if (!isZeroNote(note)) {
          acc.push({ note, index: Number(txData.transferIndex) + 1 + index });
        }

        return acc;
      }, []);

      this.privateAccount.addAccount(txData.transferIndex, hashes, pair.account, notes);
    } else if (onlyNotes.length > 0) {
      this.privateAccount.addNotes(txData.transferIndex, hashes, onlyNotes);
    } else {
      // Temporarily cache everything
      // TODO: Remove when transitioning to relayer-only
      this.privateAccount.addHashes(txData.transferIndex, hashes);
    }

    console.log('New balance:', this.privateAccount.totalBalance());
    console.log('New state:', this.privateAccount.getWholeState());
  }
}
