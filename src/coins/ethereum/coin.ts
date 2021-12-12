import Web3 from 'web3';
import BN from 'bn.js';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';

import { Note, Output } from '@/libzeropool-rs';
import { hexToBuf, HexStringReader } from '@/utils';
import { Coin } from '@/coins/coin';
import { CoinType } from '@/coins/coin-type';
import { Transaction, TxFee, TxStatus } from '@/coins/transaction';
import { CONSTANTS, convertTransaction } from './utils';
import { Config } from './config';
import { LocalTxStorage } from './storage';
import { AccountCache } from './account';
import { EthPrivateTransaction } from './private-tx';
import { RelayerBackend } from './relayer';
import tokenAbi from './token-abi.json';

// TODO: Organize presistent state properly
const TX_STORAGE_PREFIX = 'zeropool.eth-txs';
const STATE_STORAGE_PREFIX = 'zeropool.eth.state';

export class EthereumCoin extends Coin {
  private web3: Web3;
  private txStorage: LocalTxStorage;
  private accounts: AccountCache;
  private config: Config;
  private relayer: RelayerBackend;
  private erc20: Contract;

  constructor(mnemonic: string, web3: Web3, config: Config, relayer: RelayerBackend, worker: any) {
    super(mnemonic, worker);
    this.web3 = web3;
    this.txStorage = new LocalTxStorage(TX_STORAGE_PREFIX);
    this.accounts = new AccountCache(mnemonic, this.web3);
    this.erc20 = new this.web3.eth.Contract(tokenAbi as AbiItem[]) as Contract;
    this.config = config;
    this.relayer = relayer;
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

  public async getTokenBalance(account: number, /* tokenAddress: string */): Promise<string> {
    const address = this.getAddress(account);
    const balance = await this.relayer.getTokenBalance(address);

    return balance;
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

  public async mint(account: number, amount: string): Promise<void> {
    const privateKey = this.getPrivateKey(account);
    return this.relayer.mint(privateKey, amount);
  }

  public async transferPrivateToPrivate(account: number, outs: Output[]): Promise<void> {
    const privateKey = this.getPrivateKey(account);
    return this.relayer.transfer(privateKey, outs);
  }

  public async depositPrivate(account: number, amount: string): Promise<void> {
    const privateKey = this.getPrivateKey(account);
    return this.relayer.deposit(privateKey, amount);
  }

  public async withdrawPrivate(account: number, amount: string): Promise<void> {
    const privateKey = this.getPrivateKey(account);
    return this.relayer.withdraw(privateKey, amount);
  }

  public getPrivateBalance(): string {
    return this.relayer.getTotalBalance();
  }

  public getPrivateBalances(): [string, string, string] {
    return this.relayer.getBalances();
  }

  public async updatePrivateState(): Promise<void> {
    const STORAGE_PREFIX = `${STATE_STORAGE_PREFIX}.latestCheckedBlock`;

    const curBlockNumber = await this.web3.eth.getBlockNumber();
    const latestCheckedBlock = Number(localStorage.getItem(STORAGE_PREFIX)) || 0;

    // moslty useful for local testing, since getPastLogs always returns at least one latest event
    if (curBlockNumber === latestCheckedBlock) {
      return;
    }

    const logs = await this.web3.eth.getPastLogs({
      fromBlock: latestCheckedBlock,
      toBlock: curBlockNumber,
      address: this.config.contractAddress,
    });

    for (const log of logs) {
      // TODO: Batch getTransaction
      const tx = await this.web3.eth.getTransaction(log.transactionHash);
      const message = tx.input;

      this.cachePrivateTx(message);
      console.log('Contract logs', logs);
    }

    localStorage.setItem(STORAGE_PREFIX, curBlockNumber.toString());
  }


  /**
   * Attempt to extract and save usable account/notes from transaction data.
   * @param raw hex-encoded transaction data
   */
  private cachePrivateTx(raw: string) {
    const signature = this.web3.eth.abi.encodeFunctionSignature('transact()');
    const txSignature = raw.slice(0, 10);

    if (signature !== txSignature) {
      // ignore non-Message event
      return;
    }

    const txData = EthPrivateTransaction.decode(raw);
    const ciphertext = hexToBuf(txData.ciphertext);
    const pair = this.privateAccount.decryptPair(ciphertext);
    const onlyNotes = this.privateAccount.decryptNotes(ciphertext);

    const reader = new HexStringReader(txData.ciphertext);
    let numItems = reader.readNumber(4, true);
    if (!numItems || numItems > CONSTANTS.OUT + 1) {
      console.info(`Skipping invalid transaction. Number of outputs too large ${numItems}`);
      return;
    }

    const hashes = reader.readBigIntArray(numItems, 32, true).map(num => num.toString());

    console.log('Updating state', this.privateAccount.getWholeState());

    if (pair) {
      const notes = pair.notes.reduce<{ note: Note, index: number }[]>((acc, note, index) => {
        acc.push({ note, index: Number(txData.transferIndex) + 1 + index });
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
