import Web3 from 'web3';
import BN from 'bn.js';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import { TransactionReceipt, provider } from 'web3-core';
import { TransactionConfig } from 'web3-core';
import { TxFee, TxStatus } from '../../networks/transaction';
import { convertTransaction } from './utils';
import tokenAbi from './abi/token-abi.json';
import minterAbi from './abi/minter-abi.json';
import poolAbi from './abi/pool-abi.json';
import ddAbi from './abi/dd-abi.json';
import { Client } from '../../networks/client';
import HDWalletProvider from '@truffle/hdwallet-provider';
import { Config } from '../../index';
import promiseRetry from 'promise-retry';

const bs58 = require('bs58')

const RETRY_COUNT = 5;

export class EthereumClient extends Client {
  private provider?: HDWalletProvider;
  private web3: Web3;
  private token: Contract;
  private minter: Contract;
  private pool: Contract;
  private dd: Contract;

  private ddContractAddresses = new Map<string, string>();    // poolContractAddress -> directDepositContractAddress
  private tokenDecimals = new Map<string, number>();  // tokenAddress -> decimals

  public gasMultiplier: number = 1.0;

  constructor(provider: HDWalletProvider, config: Config = { transactionUrl: '{{hash}}' }) {
    super();
    this.provider = provider;
    this.web3 = new Web3(provider);
    this.token = new this.web3.eth.Contract(tokenAbi as AbiItem[]) as Contract;
    this.minter = new this.web3.eth.Contract(minterAbi as AbiItem[]) as Contract;
    this.pool = new this.web3.eth.Contract(poolAbi as AbiItem[]) as Contract;
    this.dd = new this.web3.eth.Contract(ddAbi as AbiItem[]) as Contract;
    this.transactionUrl = config.transactionUrl;
  }

  public haltClient() {
    if (this.provider) {
      this.provider.engine.stop();
      delete this.provider;
    }
  }

  private contractCallRetry(contract: Contract, address: string, method: string, args: any[] = []): Promise<any> {
    return this.commonRpcRetry(async () => {
            contract.options.address = address;
            return await contract.methods[method](...args).call()
        },
        `[SupportJS] Contract call (${method}) error`,
        RETRY_COUNT,
    );
  }

  private commonRpcRetry(closure: () => any, errorPattern: string, retriesCnt: number): Promise<any> {
      return promiseRetry(
          async (retry, attempt) => {
            try {
                return await closure();
            } catch (e) {
                console.error(`${errorPattern ?? '[SupportJS] Error occured'} [attempt #${attempt}]: ${e.message}`);
                retry(e)
            }
          },
          {
            retries: retriesCnt,
            minTimeout: 500,
            maxTimeout: 500,
          }
        );
  }

  // ------------------=========< Getting common data >=========-------------------
  // | ChainID, token name, token decimals                                        |
  // ------------------------------------------------------------------------------

  public async getChainId(): Promise<number> {
    return this.commonRpcRetry(async () => {
      return this.web3.eth.net.getId();
    }, '[SupportJS] Cannot get chain ID', RETRY_COUNT);
  }

  public async getBlockNumber(): Promise<number> {
    return this.commonRpcRetry(async () => {
      return this.web3.eth.getBlockNumber();
    }, '[SupportJS] Cannot get block number', RETRY_COUNT);
  }

  public async getTokenName(tokenAddress: string): Promise<string> {
    return this.contractCallRetry(this.token, tokenAddress, 'name');
  }

  public async decimals(tokenAddress: string): Promise<number> {
    let res = this.tokenDecimals.get(tokenAddress);
    if (!res) {
      try {
        this.token.options.address = tokenAddress;
        res = Number(await await this.contractCallRetry(this.token, tokenAddress, 'decimals'));
        this.tokenDecimals.set(tokenAddress, res);
      } catch (err) {
        console.warn(`[SupportJS] Cannot fetch decimals for the token ${tokenAddress}, using default (18). Reason: ${err.message}`);
        res = 18;
      }
    }
    
    return res;
  }

  // ------------------=========< Conversion routines >=========-------------------
  // | Between base units and human-readable                                      |
  // ------------------------------------------------------------------------------

  public baseUnit(): string {
    return 'wei';
  }

  public toBaseUnit(humanAmount: string): bigint {
    return BigInt(this.web3.utils.toWei(humanAmount, 'ether'));
  }

  public fromBaseUnit(baseAmount: bigint): string {
    return this.web3.utils.fromWei(String(baseAmount), 'ether');
  }
  
  public async toBaseTokenUnit(tokenAddress: string, humanAmount: string): Promise<bigint> {
    const decimals = BigInt(await this.decimals(tokenAddress));
    const wei = BigInt(this.toBaseUnit(humanAmount));

    const baseDecimals = 18n;
    const baseUnits = (decimals <= baseDecimals) ?
                      wei / (10n ** (baseDecimals - decimals)) :
                      wei * (10n ** (decimals - baseDecimals));

    return baseUnits;
  }

  public async fromBaseTokenUnit(tokenAddress: string, baseAmount: bigint): Promise<string> {
    const decimals = BigInt(await this.decimals(tokenAddress));

    const baseDecimals = 18n;
    const wei = (decimals <= baseDecimals) ?
                baseAmount * (10n ** (baseDecimals - decimals)) :
                baseAmount / (10n ** (decimals - baseDecimals));

    return this.fromBaseUnit(wei);
  }


  // ----------------=========< Fetching address info >=========-------------------
  // | Native&token balances, nonces, etc                                         |
  // ------------------------------------------------------------------------------

  public async getAddress(): Promise<string> {
    return (await this.web3.eth.getAccounts())[0];
  }

  public async getBalance(): Promise<bigint> {
    const res = await this.commonRpcRetry(async () => {
      return Number(await this.web3.eth.getBalance(await this.getAddress()));
    }, '[SupportJS] Unable to retrieve user balance', RETRY_COUNT);
    return BigInt(res);
  }

  public async getTokenBalance(tokenAddress: string): Promise<bigint> {
    const address = await this.getAddress();
    const balance = await this.contractCallRetry(this.token, tokenAddress, 'balanceOf', [address]);

    return BigInt(balance);
  }

  public async getTokenNonce(tokenAddress: string): Promise<number> {
    const address = await this.getAddress();
    const nonce = await this.contractCallRetry(this.token, tokenAddress, 'nonces', [address]);

    return Number(nonce);
  }

  public async allowance(tokenAddress: string, spender: string): Promise<bigint> {
    const owner = await this.getAddress();
    const nonce = await this.contractCallRetry(this.token, tokenAddress, 'allowance', [owner, spender]);

    return BigInt(nonce);
  }

  // ------------=========< Active blockchain interaction >=========---------------
  // | All actions related to the transaction sending                             |
  // ------------------------------------------------------------------------------

  public async estimateTxFee(txObject?: any): Promise<TxFee> {
    const address = await this.getAddress();
    
    const gas = await this.commonRpcRetry(async () => {
      return Number(await this.web3.eth.estimateGas(txObject ?? {from: address, to: address, value: '1'}));
    }, '[SupportJS] Unable to estimate gas', RETRY_COUNT);
    const gasPrice = await this.commonRpcRetry(async () => {
        return Number(await this.web3.eth.getGasPrice());
    }, '[SupportJS] Unable to get gas price', RETRY_COUNT);
    const fee = gas * gasPrice;

    return {
      gas: BigInt(gas),
      gasPrice: BigInt(Math.ceil(gasPrice * this.gasMultiplier)),
      fee: this.web3.utils.fromWei(fee.toString(10), 'ether'),
    };
  }

  private async getNativeNonce(): Promise<number> {
    const address = await this.getAddress();
    return this.commonRpcRetry(async () => {
        return Number(await this.web3.eth.getTransactionCount(address))
    }, '[SupportJS] Cannot get native nonce', RETRY_COUNT);
  }

  private async sendSignedTx(rawSignedTx: string): Promise<TransactionReceipt> {
    return this.commonRpcRetry(async () => {
      return this.web3.eth.sendSignedTransaction(rawSignedTx);
    }, '[SupportJS] Unable to send transaction', RETRY_COUNT);
  }

  public async sendTransaction(to: string, amount: bigint, data: string): Promise<string> {
    const address = await this.getAddress();
    var txObject: TransactionConfig = {
      from: address,
      to,
      value: amount.toString(),
      data,
    };

    const txFee = await this.estimateTxFee(txObject);
    const nonce = await this.getNativeNonce();
    txObject.gas = Number(txFee.gas);
    txObject.gasPrice = `0x${BigInt(Math.ceil(Number(txFee.gasPrice) * this.gasMultiplier)).toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);

    const receipt = await this.sendSignedTx(signedTx.raw);
    return receipt.transactionHash;
  }

  public async transfer(to: string, amount: bigint): Promise<string> {
    const from = await this.getAddress();
    const nonce = await this.getNativeNonce();
    const txFee = await this.estimateTxFee();
    const signed = await this.web3.eth.signTransaction({
      from,
      to,
      value: amount.toString(),
      nonce,
      gas: txFee.gas.toString(),
      gasPrice: BigInt(Math.ceil(Number(txFee.gasPrice) * this.gasMultiplier)).toString(),
    });

    const receipt = await this.sendSignedTx(signed.raw);
    return receipt.transactionHash;
  }

  public async transferToken(tokenAddress: string, to: string, amount: bigint): Promise<string> {
    const address = await this.getAddress();
    const encodedTx = await this.token.methods.transfer(to, BigInt(amount)).encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: tokenAddress,
      data: encodedTx,
    };

    const txFee = await this.estimateTxFee(txObject);
    const nonce = await this.getNativeNonce();
    txObject.gas = txFee.gas.toString();
    txObject.gasPrice = `0x${BigInt(Math.ceil(Number(txFee.gasPrice) * this.gasMultiplier)).toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    const receipt = await this.sendSignedTx(signedTx.raw);
    return receipt.transactionHash;
  }

  public async approve(tokenAddress: string, spender: string, amount: bigint): Promise<string> {
    const address = await this.getAddress();
    const encodedTx = await this.token.methods.approve(spender, amount).encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: tokenAddress,
      data: encodedTx,
    };

    const txFee = await this.estimateTxFee(txObject);
    const nonce = await this.getNativeNonce();
    txObject.gas = txFee.gas.toString();
    txObject.gasPrice = `0x${BigInt(Math.ceil(Number(txFee.gasPrice) * this.gasMultiplier)).toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    const receipt = await this.sendSignedTx(signedTx.raw);
    return receipt.transactionHash;
  }

  public async increaseAllowance(tokenAddress: string, spender: string, additionalAmount: bigint): Promise<string> {
    const address = await this.getAddress();
    const encodedTx = await this.token.methods.increaseAllowance(spender, BigInt(additionalAmount)).encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: tokenAddress,
      data: encodedTx,
    };

    const txFee = await this.estimateTxFee(txObject);
    const nonce = await this.getNativeNonce();
    txObject.gas = txFee.gas.toString();
    txObject.gasPrice = `0x${BigInt(Math.ceil(Number(txFee.gasPrice) * this.gasMultiplier)).toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    const receipt = await this.sendSignedTx(signedTx.raw);
    return receipt.transactionHash;
  }

  public async mint(minterAddress: string, amount: bigint): Promise<string> {
    const address = await this.getAddress();
    const encodedTx = await this.token.methods.mint(address, amount).encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: minterAddress,
      data: encodedTx,
    };

    const txFee = await this.estimateTxFee(txObject);
    const nonce = await this.getNativeNonce();
    txObject.gas = txFee.gas.toString();
    txObject.gasPrice = `0x${BigInt(Math.ceil(Number(txFee.gasPrice) * this.gasMultiplier)).toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    const receipt = await this.sendSignedTx(signedTx.raw);
    return receipt.transactionHash;
  }


  // ------------------=========< Signing routines >=========----------------------
  // | Signing data and typed data                                                |
  // ------------------------------------------------------------------------------

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
          { method: 'eth_signTypedData_v4', params: [JSON.stringify(data), address.toLowerCase()], jsonrpc: '2.0' },
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


  // -----------------=========< High-level routines >=========--------------------
  // | Direct deposits routines                                                   |
  // ------------------------------------------------------------------------------

  public async getDirectDepositContract(poolAddress: string): Promise<string> {
    let ddContractAddr = this.ddContractAddresses.get(poolAddress);
    if (!ddContractAddr) {
        this.pool.options.address = poolAddress;
        ddContractAddr = await this.contractCallRetry(this.pool, poolAddress, 'direct_deposit_queue');
        if (ddContractAddr) {
            this.ddContractAddresses.set(poolAddress, ddContractAddr);
        } else {
            throw new Error(`Cannot fetch DD contract address`);
        }
    }

    return ddContractAddr;
  }


  public async directDeposit(poolAddress: string, amount: bigint, zkAddress: string): Promise<string> {
    let ddContractAddr = await this.getDirectDepositContract(poolAddress);

    const address = await this.getAddress();
    const zkAddrBytes = `0x${Buffer.from(bs58.decode(zkAddress.substring(zkAddress.indexOf(':') + 1))).toString('hex')}`;
    const encodedTx = await this.dd.methods["directDeposit(address,uint256,bytes)"](address, amount, zkAddrBytes).encodeABI();
    var txObject: TransactionConfig = {
      from: address,
      to: ddContractAddr,
      data: encodedTx,
    };

    const txFee = await this.estimateTxFee(txObject);
    const nonce = await this.getNativeNonce();
    txObject.gas = txFee.gas.toString();
    txObject.gasPrice = `0x${BigInt(Math.ceil(Number(txFee.gasPrice) * this.gasMultiplier)).toString(16)}`;
    txObject.nonce = nonce;

    const signedTx = await this.web3.eth.signTransaction(txObject);
    const receipt = await this.sendSignedTx(signedTx.raw);
    return receipt.transactionHash;
  }
}
