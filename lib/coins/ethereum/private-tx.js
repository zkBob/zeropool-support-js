import { Proof } from 'libzeropool-rs-wasm-bundler';
import { numberToHex, padLeft } from 'web3-utils';
import { toTwosComplementHex } from './utils';
// Sizes in bytes
const MEMO_META_SIZE = 8; // fee (u64)
const MEMO_META_WITHDRAW_SIZE = 28; // fee (u64) + address (u160)
export var TxType;
(function (TxType) {
    TxType["Deposit"] = "00";
    TxType["Transfer"] = "01";
    TxType["Withdraw"] = "02";
})(TxType || (TxType = {}));
export function txTypeToString(txType) {
    switch (txType) {
        case TxType.Deposit: return 'deposit';
        case TxType.Transfer: return 'transfer';
        case TxType.Withdraw: return 'withdraw';
    }
}
export class EthPrivateTransaction {
    static fromData(txData, txType, acc, snarkParams, web3) {
        const tx = new EthPrivateTransaction();
        let curIndex = acc.nextTreeIndex() - BigInt(1);
        if (curIndex < BigInt(0)) {
            curIndex = BigInt(0);
        }
        const prevCommitmentIndex = curIndex / BigInt(128);
        const nextCommitmentIndex = acc.nextTreeIndex() / BigInt(128);
        const commitmentProofBefore = acc.getCommitmentMerkleProof(prevCommitmentIndex);
        const commitmentProofAfter = acc.getCommitmentMerkleProof(nextCommitmentIndex);
        const prevLeaf = acc.getLastLeaf();
        const rootBefore = acc.getRoot();
        const proofAfter = acc.getMerkleProofAfter(txData.out_hashes)[txData.out_hashes.length - 1];
        const rootAfter = proofAfter === null || proofAfter === void 0 ? void 0 : proofAfter.sibling[proofAfter.sibling.length - 1];
        const txProof = Proof.tx(snarkParams.transferParams, txData.public, txData.secret);
        const treeProof = Proof.tree(snarkParams.treeParams, {
            root_before: rootBefore,
            root_after: rootAfter,
            leaf: txData.commitment_root,
        }, {
            proof_filled: commitmentProofBefore,
            proof_free: commitmentProofAfter,
            prev_leaf: prevLeaf,
        });
        const txValid = Proof.verify(snarkParams.transferVk, txProof.inputs, txProof.proof);
        if (!txValid) {
            throw new Error('invalid tx proof');
        }
        const treeValid = Proof.verify(snarkParams.treeVk, treeProof.inputs, treeProof.proof);
        if (!treeValid) {
            throw new Error('invalid tree proof');
        }
        tx.selector = web3.eth.abi.encodeFunctionSignature('transact()').slice(2);
        tx.nullifier = BigInt(txData.public.nullifier);
        tx.outCommit = BigInt(txData.public.out_commit);
        tx.transferIndex = BigInt(txData.secret.tx.output[0].i);
        tx.energyAmount = BigInt(txData.parsed_delta.e);
        tx.tokenAmount = BigInt(txData.parsed_delta.v);
        tx.transactProof = flattenSnarkProof(txProof.proof);
        tx.rootAfter = BigInt(rootAfter);
        tx.treeProof = flattenSnarkProof(treeProof.proof);
        tx.txType = txType;
        tx.memo = txData.memo;
        return tx;
    }
    get ciphertext() {
        if (this.txType === TxType.Withdraw) {
            return this.memo.slice(MEMO_META_WITHDRAW_SIZE * 2);
        }
        return this.memo.slice(MEMO_META_SIZE * 2);
    }
    /**
     * Returns encoded transaction ready to use as data for the smart contract.
     */
    encode() {
        const writer = new HexStringWriter();
        writer.writeHex(this.selector);
        writer.writeBigInt(this.nullifier, 32);
        writer.writeBigInt(this.outCommit, 32);
        writer.writeBigInt(this.transferIndex, 6);
        writer.writeBigInt(this.energyAmount, 8);
        writer.writeBigInt(this.tokenAmount, 8);
        writer.writeBigIntArray(this.transactProof, 32);
        writer.writeBigInt(this.rootAfter, 32);
        writer.writeBigIntArray(this.treeProof, 32);
        writer.writeHex(this.txType.toString());
        writer.writeNumber(this.memo.length / 2, 2);
        writer.writeHex(this.memo);
        return writer.toString();
    }
    static decode(data) {
        let tx = new EthPrivateTransaction();
        let reader = new HexStringReader(data);
        tx.selector = reader.readHex(4);
        tx.nullifier = reader.readBigInt(32);
        tx.outCommit = reader.readBigInt(32);
        tx.transferIndex = reader.readBigInt(6);
        tx.energyAmount = reader.readBigInt(8);
        tx.tokenAmount = reader.readBigInt(8);
        tx.transactProof = reader.readBigIntArray(8, 32);
        tx.rootAfter = reader.readBigInt(32);
        tx.treeProof = reader.readBigIntArray(8, 32);
        tx.txType = reader.readHex(1);
        const memoSize = reader.readNumber(2);
        tx.memo = reader.readHex(memoSize);
        return tx;
    }
}
export function flattenSnarkProof(p) {
    return [p.a, p.b.flat(), p.c].flat().map(n => {
        return BigInt(n);
    });
}
class HexStringWriter {
    constructor() {
        this.buf = '0x';
    }
    toString() {
        return this.buf;
    }
    writeHex(hex) {
        this.buf += hex;
    }
    writeBigInt(num, numBytes) {
        this.buf += toTwosComplementHex(num, numBytes);
    }
    writeBigIntArray(nums, numBytes) {
        for (let num of nums) {
            this.writeBigInt(num, numBytes);
        }
    }
    writeNumber(num, numBytes) {
        this.buf += padLeft(numberToHex(num).slice(2), numBytes * 2);
    }
}
class HexStringReader {
    constructor(data) {
        if (data.slice(0, 2) == '0x') {
            data = data.slice(2);
        }
        this.data = data;
        this.curIndex = 0;
    }
    readHex(numBytes) {
        const sliceEnd = this.curIndex + numBytes * 2;
        const res = this.data.slice(this.curIndex, sliceEnd);
        this.curIndex = sliceEnd;
        return res;
    }
    readNumber(numBytes) {
        const hex = this.readHex(numBytes);
        return parseInt(hex, 16);
    }
    readBigInt(numBytes) {
        const hex = this.readHex(numBytes);
        return BigInt('0x' + hex);
    }
    readBigIntArray(numElements, numBytesPerElement) {
        return [...Array(numElements)]
            .map(() => this.readBigInt(numBytesPerElement));
    }
}
// export function bigIntToHex(num: bigint, numBytes: number): string {
//   const hex = toTwosComplement(num.toString());
//   return hex.slice(hex.length - numBytes * 2);
// }
//# sourceMappingURL=private-tx.js.map