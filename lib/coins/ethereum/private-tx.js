var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { Proof } from 'libzeropool-rs-wasm-bundler';
// Sizes in bytes
var MEMO_META_SIZE = 8; // fee (u64)
var MEMO_META_WITHDRAW_SIZE = 28; // fee (u64) + address (u160)
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
var EthPrivateTransaction = /** @class */ (function () {
    function EthPrivateTransaction() {
    }
    EthPrivateTransaction.fromData = function (txData, txType, acc, transferParams, treeParams, web3) {
        var tx = new EthPrivateTransaction();
        var curIndex = acc.nextTreeIndex() - BigInt(1);
        if (curIndex < BigInt(0)) {
            curIndex = BigInt(0);
        }
        var prevCommitmentIndex = curIndex / BigInt(128);
        var nextCommitmentIndex = acc.nextTreeIndex() / BigInt(128);
        var commitmentProofBefore = acc.getCommitmentMerkleProof(prevCommitmentIndex);
        var commitmentProofAfter = acc.getCommitmentMerkleProof(nextCommitmentIndex);
        var prevLeaf = acc.getLastLeaf();
        var rootBefore = acc.getRoot();
        var proofAfter = acc.getMerkleProofAfter(txData.out_hashes)[txData.out_hashes.length - 1];
        var rootAfter = proofAfter === null || proofAfter === void 0 ? void 0 : proofAfter.sibling[proofAfter.sibling.length - 1];
        var txProof = Proof.tx(transferParams, txData.public, txData.secret);
        var treeProof = Proof.tree(treeParams, {
            root_before: rootBefore,
            root_after: rootAfter,
            leaf: txData.commitment_root,
        }, {
            proof_filled: commitmentProofBefore,
            proof_free: commitmentProofAfter,
            prev_leaf: prevLeaf,
        });
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
    };
    Object.defineProperty(EthPrivateTransaction.prototype, "ciphertext", {
        get: function () {
            if (this.txType === TxType.Withdraw) {
                return this.memo.slice(MEMO_META_WITHDRAW_SIZE * 2);
            }
            return this.memo.slice(MEMO_META_SIZE * 2);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Returns encoded transaction ready to use as data for the smart contract.
     */
    EthPrivateTransaction.prototype.encode = function () {
        var writer = new HexStringWriter();
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
    };
    EthPrivateTransaction.decode = function (data) {
        var tx = new EthPrivateTransaction();
        var reader = new HexStringReader(data);
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
        var memoSize = reader.readNumber(2);
        tx.memo = reader.readHex(memoSize);
        return tx;
    };
    return EthPrivateTransaction;
}());
export { EthPrivateTransaction };
export function flattenSnarkProof(p) {
    return [p.a, p.b.flat(), p.c].flat().map(function (n) {
        var hex = BigInt(n);
        return hex;
    });
}
var HexStringWriter = /** @class */ (function () {
    function HexStringWriter() {
        this.buf = '0x';
    }
    HexStringWriter.prototype.toString = function () {
        return this.buf;
    };
    HexStringWriter.prototype.writeHex = function (hex) {
        this.buf += hex;
    };
    HexStringWriter.prototype.writeBigInt = function (num, numBytes) {
        this.buf += num.toString(16).slice(-numBytes * 2).padStart(numBytes * 2, '0');
    };
    HexStringWriter.prototype.writeBigIntArray = function (nums, numBytes) {
        for (var _i = 0, nums_1 = nums; _i < nums_1.length; _i++) {
            var num = nums_1[_i];
            this.writeBigInt(num, numBytes);
        }
    };
    HexStringWriter.prototype.writeNumber = function (num, numBytes) {
        this.buf += num.toString(16).slice(-numBytes * 2).padStart(numBytes * 2, '0');
    };
    return HexStringWriter;
}());
var HexStringReader = /** @class */ (function () {
    function HexStringReader(data) {
        if (data.slice(0, 2) == '0x') {
            data = data.slice(2);
        }
        this.data = data;
        this.curIndex = 0;
    }
    HexStringReader.prototype.readHex = function (numBytes) {
        var sliceEnd = this.curIndex + numBytes * 2;
        var res = this.data.slice(this.curIndex, sliceEnd);
        this.curIndex = sliceEnd;
        return res;
    };
    HexStringReader.prototype.readNumber = function (numBytes) {
        var hex = this.readHex(numBytes);
        return parseInt(hex, 16);
    };
    HexStringReader.prototype.readBigInt = function (numBytes) {
        var hex = this.readHex(numBytes);
        return BigInt('0x' + hex);
    };
    HexStringReader.prototype.readBigIntArray = function (numElements, numBytesPerElement) {
        var _this = this;
        return __spreadArray([], Array(numElements), true).map(function () { return _this.readBigInt(numBytesPerElement); });
    };
    return HexStringReader;
}());
//# sourceMappingURL=private-tx.js.map