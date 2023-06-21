import Web3 from 'web3';
import BN from 'bn.js';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import { provider } from 'web3-core';
import { TransactionConfig } from 'web3-core';

import { TxFee, TxStatus } from '../../networks/transaction';
import { convertTransaction } from './utils';
import tokenAbi from './token-abi.json';
import minterAbi from './minter-abi.json';
import poolAbi from './pool-abi.json';
import ddAbi from './dd-abi.json';
import { Client } from '../../networks/client';

const bs58 = require('bs58')

export interface Config {
  transactionUrl: string;
}
export class EthereumClient extends Client {
  private web3: Web3;
  private token: Contract;
  private minter: Contract;
  private pool: Contract;
  private dd: Contract;

  private ddContractAddresses = new Map<string, string>();    // poolContractAddress -> directDepositContractAddress
  private tokenDecimals = new Map<string, number>();  // tokenAddress -> decimals

  public gasMultiplier: number = 1.0;

  constructor(provider: provider, config: Config = { transactionUrl: '{{hash}}' }) {
    super();
    this.web3 = new Web3(provider);
    this.token = new this.web3.eth.Contract(tokenAbi as AbiItem[]) as Contract;
    this.minter = new this.web3.eth.Contract(minterAbi as AbiItem[]) as Contract;
    this.pool = new this.web3.eth.Contract(poolAbi as AbiItem[]) as Contract;
    this.dd = new this.web3.eth.Contract(ddAbi as AbiItem[]) as Contract;
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

  public async transfer(to: string, amount: string): Promise<string> {
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
      gasPrice: BigInt(Math.ceil(Number(gasPrice) * this.gasMultiplier)).toString(),
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

    return receipt.transactionHash;
  }

  public async decimals(tokenAddress: string): Promise<number> {
    let res = this.tokenDecimals.get(tokenAddress);
    if (!res) {
      try {
        this.token.options.address = tokenAddress;
        res = Number(await this.token.methods.decimals().call());
        this.tokenDecimals.set(tokenAddress, res);
      } catch (err) {
        console.log(`Cannot fetch decimals for the token ${tokenAddress}, using default (18). Reason: ${err.message}`);
        res = 18;
      }
    }
    
    return res;
  }

  /**
   * Converts a token amount to the minimum supported resolution
   * Resolution depends on token's `decimal` property
   * @param amount in Ether\tokens
   */
  public async toBaseUnit(tokenAddress: string, amount: string): Promise<string> {
    const decimals = BigInt(await this.decimals(tokenAddress));
    const wei = BigInt(this.web3.utils.toWei(amount, 'ether'));
    const baseUnits = wei / (10n ** (18n - decimals));
    
    return baseUnits.toString(10);
  }

  /**
   * Converts Wei to ether.
   * @param amount in Wei
   */
  public async fromBaseUnit(tokenAddress: string, amount: string): Promise<string> {
    const decimals = BigInt(await this.decimals(tokenAddress));
    const wei = BigInt(amount) * (10n ** (18n - decimals));

    return this.web3.utils.fromWei(wei.toString(10), 'ether');
  }

  public async estimateTxFee(): Promise<TxFee> {
    const address = await this.getAddress();
    const gas = await this.web3.eth.estimateGas({
      from: address,
      to: address,
      value: '1',
    });
    const gasPrice = Number(await this.web3.eth.getGasPrice());
    const fee = new BN(gas).mul(new BN(gasPrice));

    return {
      gas: gas.toString(),
      gasPrice: BigInt(Math.ceil(gasPrice * this.gasMultiplier)).toString(),
      fee: this.web3.utils.fromWei(fee.toString(10), 'ether'),
    };
  }

  public async mint(minterAddress: string, amount: string): Promise<string> {
    const address = await this.getAddress();
    const encodedTx = await this.token.methods.mint(address, BigInt(amount)).encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: minterAddress,
      data: encodedTx,
    };

    const gas = await this.web3.eth.estimateGas(txObject);
    const gasPrice = Number(await this.web3.eth.getGasPrice());
    const nonce = await this.web3.eth.getTransactionCount(address);
    txObject.gas = gas;
    txObject.gasPrice = `0x${BigInt(Math.ceil(gasPrice * this.gasMultiplier)).toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    const receipt = await this.web3.eth.sendSignedTransaction(signedTx.raw);

    return receipt.transactionHash;
  }

  public async transferToken(tokenAddress: string, to: string, amount: string): Promise<string> {
    const address = await this.getAddress();
    const encodedTx = await this.token.methods.transfer(to, BigInt(amount)).encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: tokenAddress,
      data: encodedTx,
    };

    const gas = await this.web3.eth.estimateGas(txObject);
    const gasPrice = Number(await this.web3.eth.getGasPrice());
    const nonce = await this.web3.eth.getTransactionCount(address);
    txObject.gas = gas;
    txObject.gasPrice = `0x${BigInt(Math.ceil(gasPrice * this.gasMultiplier)).toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    const receipt = await this.web3.eth.sendSignedTransaction(signedTx.raw);

    return receipt.transactionHash;
  }

  public async approve(tokenAddress: string, spender: string, amount: string): Promise<string> {
    const address = await this.getAddress();
    const encodedTx = await this.token.methods.approve(spender, BigInt(amount)).encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: tokenAddress,
      data: encodedTx,
    };

    const gas = await this.web3.eth.estimateGas(txObject);
    const gasPrice = Number(await this.web3.eth.getGasPrice());
    const nonce = await this.web3.eth.getTransactionCount(address);
    txObject.gas = gas;
    txObject.gasPrice = `0x${BigInt(Math.ceil(gasPrice * this.gasMultiplier)).toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    const receipt = await this.web3.eth.sendSignedTransaction(signedTx.raw);

    return receipt.transactionHash;
  }

  public async increaseAllowance(tokenAddress: string, spender: string, additionalAmount: string): Promise<string> {
    const address = await this.getAddress();
    const encodedTx = await this.token.methods.increaseAllowance(spender, BigInt(additionalAmount)).encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: tokenAddress,
      data: encodedTx,
    };

    const gas = await this.web3.eth.estimateGas(txObject);
    const gasPrice = Number(await this.web3.eth.getGasPrice());
    const nonce = await this.web3.eth.getTransactionCount(address);
    txObject.gas = gas;
    txObject.gasPrice = `0x${BigInt(Math.ceil(gasPrice * this.gasMultiplier)).toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    const receipt = await this.web3.eth.sendSignedTransaction(signedTx.raw);

    return receipt.transactionHash;
  }

  public async allowance(tokenAddress: string, spender: string): Promise<bigint> {
    const owner = await this.getAddress();
    this.token.options.address = tokenAddress;
    const nonce = await this.token.methods.allowance(owner, spender).call();

    return BigInt(nonce);
  }

  public async getDirectDepositContract(poolAddress: string): Promise<string> {
    let ddContractAddr = this.ddContractAddresses.get(poolAddress);
    if (!ddContractAddr) {
        this.pool.options.address = poolAddress;
        ddContractAddr = await this.pool.methods.direct_deposit_queue().call();
        if (ddContractAddr) {
            this.ddContractAddresses.set(poolAddress, ddContractAddr);
        } else {
            throw new Error(`Cannot fetch DD contract address`);
        }
    }

    return ddContractAddr;
  }


  public async directDeposit(poolAddress: string, amount: string, zkAddress: string): Promise<string> {
    let ddContractAddr = await this.getDirectDepositContract(poolAddress);

    const address = await this.getAddress();
    const zkAddrBytes = `0x${Buffer.from(bs58.decode(zkAddress.substring(zkAddress.indexOf(':') + 1))).toString('hex')}`;
    const encodedTx = await this.dd.methods["directDeposit(address,uint256,bytes)"](address, BigInt(amount), zkAddrBytes).encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: ddContractAddr,
      data: encodedTx,
    };

    const gas = await this.web3.eth.estimateGas(txObject);
    const gasPrice = Number(await this.web3.eth.getGasPrice());
    const nonce = await this.web3.eth.getTransactionCount(address);
    txObject.gas = gas;
    txObject.gasPrice = `0x${BigInt(Math.ceil(gasPrice * this.gasMultiplier)).toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    const receipt = await this.web3.eth.sendSignedTransaction(signedTx.raw);

    return receipt.transactionHash;
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
          { method: 'eth_signTypedData_v4', params: [data, address.toLowerCase()], jsonrpc: '2.0' },
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
