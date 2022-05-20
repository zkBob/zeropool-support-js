import Web3 from 'web3';
import BN from 'bn.js';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import { provider } from 'web3-core';
import { TransactionConfig } from 'web3-core';

import { TxFee, TxStatus } from '../../networks/transaction';
import { convertTransaction } from './utils';
import tokenAbi from './token-abi.json';
import { Client } from '../../networks/client';

export interface Config {
  transactionUrl: string;
}
export class EthereumClient extends Client {
  private web3: Web3;
  private token: Contract;

  constructor(provider: provider, config: Config = { transactionUrl: '{{hash}}' }) {
    super();
    this.web3 = new Web3(provider);
    this.token = new this.web3.eth.Contract(tokenAbi as AbiItem[]) as Contract;
    this.transactionUrl = config.transactionUrl;
  }

  public async getChainId(): Promise<number> {
    return (await this.web3.eth.net.getId());
  }

  public async getAddress(): Promise<string> {
    return (await this.web3.eth.getAccounts())[0];
  }

  public async getBalance(): Promise<string> {
    return await this.web3.eth.getBalance(await this.getAddress());
  }

  public async getTokenBalance(tokenAddress: string): Promise<string> {
    const address = await this.getAddress();
    this.token.options.address = tokenAddress; // TODO: Is it possible to pass the contract address to the `call` method?
    const balance = this.token.methods.balanceOf(address).call();

    return balance;
  }

  public async getTokenNonce(tokenAddress: string): Promise<string> {
    const address = await this.getAddress();
    this.token.options.address = tokenAddress;
    const nonce = this.token.methods.nonces(address).call();

    return nonce;
  }

  public async getTokenName(tokenAddress: string): Promise<string> {
    this.token.options.address = tokenAddress;
    const name = this.token.methods.name().call();

    return name;
  }

  public async transferToken(tokenAddress: string, to: string, amount: string): Promise<void> {
    const from = await this.getAddress();
    const nonce = await this.web3.eth.getTransactionCount(from);
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

    const signed = await this.web3.eth.signTransaction(raw);
    const receipt = await this.web3.eth.sendSignedTransaction(signed.raw);
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
    convertTransaction(nativeTx, timestamp, status);
  }

  public async transfer(to: string, amount: string): Promise<void> {
    const from = await this.getAddress();
    const nonce = await this.web3.eth.getTransactionCount(from);
    const gas = await this.web3.eth.estimateGas({ from, to, value: amount });
    const gasPrice = await this.web3.eth.getGasPrice();
    const signed = await this.web3.eth.signTransaction({
      from,
      to,
      value: amount,
      nonce,
      gas,
      gasPrice,
    });

    const receipt = await this.web3.eth.sendSignedTransaction(signed.raw);
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
    convertTransaction(nativeTx, timestamp, status);
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
    const address = await this.getAddress();
    const gas = await this.web3.eth.estimateGas({
      from: address,
      to: address,
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

  public async mint(tokenAddress: string, amount: string): Promise<void> {
    const address = await this.getAddress();
    const encodedTx = await this.token.methods.mint(address, BigInt(amount)).encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: tokenAddress,
      data: encodedTx,
    };

    const gas = await this.web3.eth.estimateGas(txObject);
    const gasPrice = BigInt(await this.web3.eth.getGasPrice());
    const nonce = await this.web3.eth.getTransactionCount(address);
    txObject.gas = gas;
    txObject.gasPrice = `0x${gasPrice.toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    await this.web3.eth.sendSignedTransaction(signedTx.raw);
  }

  public async approve(tokenAddress: string, spender: string, amount: string): Promise<void> {
    const address = await this.getAddress();
    const encodedTx = await this.token.methods.approve(spender, BigInt(amount)).encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: tokenAddress,
      data: encodedTx,
    };

    const gas = await this.web3.eth.estimateGas(txObject);
    const gasPrice = BigInt(await this.web3.eth.getGasPrice());
    const nonce = await this.web3.eth.getTransactionCount(address);
    txObject.gas = gas;
    txObject.gasPrice = `0x${gasPrice.toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    await this.web3.eth.sendSignedTransaction(signedTx.raw);
  }


  public async sign(data: string): Promise<string> {
    const address = await this.getAddress();
    const signature = await this.web3.eth.sign(data, address);

    return signature;
  }

  public async signTypedData(data: object): Promise<string> {
    const address = await this.getAddress();
    const provider = this.web3.currentProvider;

    const signPromise = new Promise<string>((resolve, reject) => {

      if (typeof provider != 'string' && typeof provider?.send != 'undefined') {
        provider.send(
          { method: 'eth_signTypedData', params: [data, address], jsonrpc: '2.0' },
          function (error, result) {
            if (error) {
              reject(error);
            }

            if (result?.result) {
              resolve(result.result);
            } else {
              reject('Unable to sign: ' + result?.error);
            }
          });
      } else {
        reject(Error('Incorrect provider'));
      }
    });

    return signPromise;
  }
}
