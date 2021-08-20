import { TransactionData, Proof, Params, SnarkProof, TreePub, TreeSec } from 'libzeropool-rs-wasm-bundler';
import Web3 from 'web3';

import { base64ToHex } from '../../utils';

// Sizes in bytes
const BIGNUM_SIZE: number = 32;

export enum TxType {
  Deposit = '00',
  Transfer = '01',
  Withdraw = '02',
}

export class EthPrivateTransaction {
  /** Hex encoded smart contract method id */
  public selector: string;
  public nullifier: BigInt;
  public outCommit: BigInt;
  public transferIndex: BigInt;
  public eneryAmount: BigInt;
  public tokenAmount: BigInt;
  public transactProof: BigInt[];
  public rootAfter: BigInt;
  public treeProof: BigInt[];
  public txType: TxType;
  /** Memo block size */
  public memoSize: number;
  /** Smart contract level metadata */
  public memoMeta: string;
  /** Encrypted tx metadata, used on client only */
  public memoMessage: string;

  static fromData(txData: TransactionData, params: Params, web3: Web3, metadata: BigInt): EthPrivateTransaction {
    const tx = new EthPrivateTransaction();

    const txProof = Proof.tx(params, txData.public, txData.secret);
    const treeProof = Proof.tree(params, {
      root_before: '',
      root_after: '',
      leaf: '',
    }, {
      proof_filled: '',
      proof_free: '',
      prev_leaf: '',
    });

    tx.selector = web3.eth.abi.encodeFunctionSignature('transact()');
    tx.nullifier = BigInt(txData.public.nullifier);
    tx.outCommit = BigInt(txData.public.out_commit);
    tx.transferIndex = BigInt(txData.secret.tx.output.account.i); // ?
    tx.eneryAmount = BigInt(txData.secret.tx.output.account.e); // ?
    tx.tokenAmount = BigInt(txData.secret.tx.output.account.b); // sum of output notes?
    tx.transactProof = formatSnarkProof(txProof.proof);
    tx.rootAfter = rand_fr_hex();
    tx.treeProof = formatSnarkProof(treeProof.proof);

    tx.txType = TxType.Transfer;

    const encTx = base64ToHex(txData.ciphertext);
    tx.memoSize = txData.memo.length;
    tx.memoMeta = metadata.toString(16).slice(-16);
    tx.memoSize = tx.memoMeta.length / 2;
    tx.memoMessage = encTx;

    return tx;
  }

  /**
   * Returns encoded transaction ready to use as data for the smart contract.
   */
  encode(): string {
    const writer = new HexStringWriter();

    writer.writeHex(this.selector);
    writer.writeBigInt(this.nullifier, 32);
    writer.writeBigInt(this.outCommit, 32);
    writer.writeBigInt(this.transferIndex, 6);
    writer.writeBigInt(this.eneryAmount, 14);
    writer.writeBigInt(this.tokenAmount, 8);
    writer.writeBigIntArray(this.transactProof, 32);
    writer.writeBigInt(this.rootAfter, 32);
    writer.writeBigIntArray(this.treeProof, 32);
    writer.writeHex(this.txType.toString());
    writer.writeNumber(this.memoSize, 1);
    writer.writeHex(this.memoMeta);
    writer.writeHex(this.memoMessage);

    return writer.toString();
  }

  static decode(data: string): EthPrivateTransaction {
    let tx = new EthPrivateTransaction();
    let reader = new HexStringReader(data);

    tx.selector = reader.readHex(4);
    tx.nullifier = reader.readBigInt(32);
    tx.outCommit = reader.readBigInt(32);
    tx.transferIndex = reader.readBigInt(6);
    tx.eneryAmount = reader.readBigInt(14);
    tx.tokenAmount = reader.readBigInt(8);
    tx.transactProof = reader.readBigIntArray(8, 32);
    tx.rootAfter = reader.readBigInt(32);
    tx.treeProof = reader.readBigIntArray(8, 32);
    tx.txType = reader.readHex(1) as TxType;
    tx.memoSize = reader.readNumber(1);
    tx.memoMeta = reader.readHex(8);
    tx.memoMessage = reader.readHex(tx.memoSize - 8);

    return tx;
  }
}

function formatSnarkProof(proof: SnarkProof): BigInt[] {
  const a = proof.a.map(num => BigInt(num));
  const b = proof.b.flat().map(num => BigInt(num));
  const c = proof.c.map(num => BigInt(num));

  return [...a, ...b, ...c];
}

class HexStringWriter {
  buf: string;

  constructor() {
    this.buf = '0x';
  }

  toString() {
    return this.buf;
  }

  writeHex(hex: string) {
    this.buf += hex;
  }

  writeBigInt(num: BigInt, numBytes: number) {
    this.buf += num.toString(16).slice(-numBytes * 2);
  }

  writeBigIntArray(nums: BigInt[], numBytes: number) {
    for (let num of nums) {
      this.writeBigInt(num, numBytes);
    }
  }

  writeNumber(num: number, numBytes: number) {
    this.buf += num.toString(16).slice(-numBytes * 2);
  }
}

class HexStringReader {
  data: string;
  curIndex: number;

  constructor(data: string) {
    if (data.slice(0, 2) == '0x') {
      data = data.slice(2);
    }

    this.data = data;
    this.curIndex = 0;
  }

  readHex(numBytes: number): string {
    const sliceEnd = this.curIndex + numBytes * 2;
    const res = this.data.slice(this.curIndex, sliceEnd);
    this.curIndex = sliceEnd;
    return res;
  }

  readNumber(numBytes: number): number {
    const hex = this.readHex(numBytes);
    return parseInt(hex, 16);
  }

  readBigInt(numBytes: number): BigInt {
    const hex = this.readHex(numBytes);
    return BigInt('0x' + hex);
  }

  readBigIntArray(numElements: number, numBytesPerElement: number): BigInt[] {
    return [...Array(numElements)]
      .map(() => this.readBigInt(numBytesPerElement));
  }
}
