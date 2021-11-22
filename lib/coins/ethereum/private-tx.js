"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenSnarkProof = exports.EthPrivateTransaction = exports.txTypeToString = exports.TxType = void 0;
const libzeropool_rs_1 = require("../../libzeropool-rs");
const utils_1 = require("../../utils");
const utils_2 = require("./utils");
// Sizes in bytes
const MEMO_META_SIZE = 8; // fee (u64)
const MEMO_META_WITHDRAW_SIZE = 8 + 8 + 20; // fee (u64) + amount + address (u160)
var TxType;
(function (TxType) {
    TxType["Deposit"] = "00";
    TxType["Transfer"] = "01";
    TxType["Withdraw"] = "02";
})(TxType = exports.TxType || (exports.TxType = {}));
function txTypeToString(txType) {
    switch (txType) {
        case TxType.Deposit: return 'deposit';
        case TxType.Transfer: return 'transfer';
        case TxType.Withdraw: return 'withdraw';
    }
}
exports.txTypeToString = txTypeToString;
class EthPrivateTransaction {
    static fromData(txData, txType, acc, snarkParams, web3) {
        const tx = new EthPrivateTransaction();
        const nextIndex = acc.nextTreeIndex();
        let curIndex = nextIndex - BigInt(utils_2.CONSTANTS.OUT + 1);
        if (curIndex < BigInt(0)) {
            curIndex = BigInt(0);
        }
        const prevCommitmentIndex = curIndex / BigInt(2 ** utils_2.CONSTANTS.OUTLOG);
        const nextCommitmentIndex = acc.nextTreeIndex() / BigInt(2 ** utils_2.CONSTANTS.OUTLOG);
        const proofFilled = acc.getCommitmentMerkleProof(prevCommitmentIndex);
        const proofFree = acc.getCommitmentMerkleProof(nextCommitmentIndex);
        const prevLeaf = acc.getMerkleNode(utils_2.CONSTANTS.OUTLOG, prevCommitmentIndex);
        const rootBefore = acc.getRoot();
        const rootAfter = acc.getMerkleRootAfterCommitment(nextCommitmentIndex, txData.commitment_root);
        const txProof = libzeropool_rs_1.Proof.tx(snarkParams.transferParams, txData.public, txData.secret);
        const treeProof = libzeropool_rs_1.Proof.tree(snarkParams.treeParams, {
            root_before: rootBefore,
            root_after: rootAfter,
            leaf: txData.commitment_root,
        }, {
            proof_filled: proofFilled,
            proof_free: proofFree,
            prev_leaf: prevLeaf,
        });
        const txValid = libzeropool_rs_1.Proof.verify(snarkParams.transferVk, txProof.inputs, txProof.proof);
        if (!txValid) {
            throw new Error('invalid tx proof');
        }
        const treeValid = libzeropool_rs_1.Proof.verify(snarkParams.treeVk, treeProof.inputs, treeProof.proof);
        if (!treeValid) {
            throw new Error('invalid tree proof');
        }
        tx.selector = web3.eth.abi.encodeFunctionSignature('transact()').slice(2);
        tx.nullifier = BigInt(txData.public.nullifier);
        tx.outCommit = BigInt(txData.public.out_commit);
        tx.transferIndex = BigInt(txData.parsed_delta.index);
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
        const writer = new utils_1.HexStringWriter();
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
        let reader = new utils_1.HexStringReader(data);
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
exports.EthPrivateTransaction = EthPrivateTransaction;
function flattenSnarkProof(p) {
    return [p.a, p.b.flat(), p.c].flat().map(n => {
        return BigInt(n);
    });
}
exports.flattenSnarkProof = flattenSnarkProof;
//# sourceMappingURL=private-tx.js.map