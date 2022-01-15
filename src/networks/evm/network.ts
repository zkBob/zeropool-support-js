import Web3 from 'web3';
import BN from 'bn.js';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';

import { Output } from '@/libzeropool-rs';
import { Network } from '@/networks/network';
import { NetworkType } from '@/networks/network-type';
import { ZeroPoolState } from '@/state';
import { Transaction, TxFee, TxStatus } from '@/networks/transaction';
import { convertTransaction } from './utils';
import { Config } from './config';
import { LocalTxStorage } from './storage';
import { AccountCache } from './account';
import { RelayerBackend } from './relayer';
import tokenAbi from './token-abi.json';

// TODO: Organize presistent state properly
const TX_STORAGE_PREFIX = 'zeropool.eth-txs';

export class EvmNetwork extends Network {
  private web3: Web3;
  private txStorage: LocalTxStorage;
  private accounts: AccountCache;
  private config: Config;
  private zp: RelayerBackend;
  private token: Contract;

  constructor(mnemonic: string, web3: Web3, config: Config, state: ZeroPoolState, zpBackend: RelayerBackend, worker: any) {
    super(mnemonic, state, worker);
    this.web3 = web3;
    this.txStorage = new LocalTxStorage(TX_STORAGE_PREFIX);
    this.accounts = new AccountCache(mnemonic, this.web3);
    this.token = new this.web3.eth.Contract(tokenAbi as AbiItem[]) as Contract;
    this.config = config;
    this.zp = zpBackend;
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

  public async getTokenBalance(account: number, tokenAddress: string): Promise<string> {
    const address = this.getAddress(account);
    const balance = await this.zp.getTokenBalance(address, tokenAddress);

    return balance;
  }

  public async transferToken(account: number, tokenAddress: string, to: string, amount: string): Promise<void> {
    const from = this.getAddress(account);
    const nonce = await this.web3.eth.getTransactionCount(this.getAddress(account));
    const gas = await this.web3.eth.estimateGas({ from, to, value: amount });
    const gasPrice = await this.web3.eth.getGasPrice();

    const data = this.token.methods.transfer(to, amount).encodeABI();
    const raw = {
      nonce,
      gas,
      gasPrice,
      to: tokenAddress,
      value: 0,
      data,
    };

    const signed = await this.web3.eth.accounts.signTransaction(raw, this.getPrivateKey(account))
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

  public async transfer(account: number, to: string, amount: string): Promise<void> {
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

  public getNetworkType(): NetworkType {
    return NetworkType.ethereum;
  }

  public async mint(account: number, tokenAddress: string, amount: string): Promise<void> {
    const privateKey = this.getPrivateKey(account);
    return this.zp.mint(tokenAddress, privateKey, amount);
  }

  public async transferShielded(tokenAddress: string, outs: Output[]): Promise<void> {
    return this.zp.transfer(tokenAddress, outs);
  }

  public async depositShielded(account: number, tokenAddress: string, amount: string): Promise<void> {
    const privateKey = this.getPrivateKey(account);
    return this.zp.deposit(tokenAddress, privateKey, amount);
  }

  public async withdrawShielded(account: number, tokenAddress: string, amount: string): Promise<void> {
    const privateKey = this.getPrivateKey(account);
    return this.zp.withdraw(tokenAddress, privateKey, amount);
  }

  public getShieldeBalance(): string {
    return this.zp.getTotalBalance();
  }

  public getShieldedBalances(): [string, string, string] {
    return this.zp.getBalances();
  }

  public free(): void {
    this.zp.free();
  }
}
