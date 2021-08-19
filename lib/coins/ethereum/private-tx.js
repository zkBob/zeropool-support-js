import { Proof } from "libzeropool-rs-wasm-bundler";
export var TxType;
(function (TxType) {
    TxType["Deposit"] = "00";
    TxType["Transfer"] = "01";
    TxType["Withdraw"] = "02";
})(TxType || (TxType = {}));
var EthPrivateTransaction = /** @class */ (function () {
    function EthPrivateTransaction() {
    }
    EthPrivateTransaction.fromData = function (txData, params, web3) {
        var tx = new EthPrivateTransaction();
        var proof = Proof.tx(params, txData.public, txData.secret);
        var treeProof = Proof.tree(params, {
            root_before: '',
            root_after: '',
            leaf: '',
        }, {
            proof_filled: '',
            proof_free: '',
            prev_leaf: '',
        });
        tx.selector = web3.eth.abi.encodeFunctionSignature("transact()");
        tx.nullifier = txData.public.nullifier;
        tx.outCommit = txData.public.out_commit;
        tx.transferIndex = txData.secret.tx.output.account.i;
        tx.eneryAmount = txData.secret.tx.output.account.e; // FIXME: ?
        tx.tokenAmount = "0000000000000000";
        tx.transactProof = formatProof(proof.proof);
        tx.rootAfter = rand_fr_hex();
        tx.treeProof = rand_fr_hex_list(8);
        tx.txType = TxType.Transfer;
        tx.memoSize = txData.memo.length.toString(16).slice();
        tx.memoFee = "0000000000000000";
        tx.memoMessage = rand_bigint_hex(parseInt(memo_size, 16) - memo_fee.length / 2);
        return tx;
    };
    /**
     * Returns encoded transaction ready to use as data for the smart contract.
     */
    EthPrivateTransaction.prototype.encode = function () {
        var data = [
            this.selector, this.nullifier, this.outCommit, this.transferIndex,
            this.eneryAmount, this.tokenAmount, this.transactProof,
            this.rootAfter, this.treeProof, this.txType,
            this.memoSize, this.memoFee, this.memoMessage
        ].join('');
        return data;
    };
    EthPrivateTransaction.decode = function (data) {
        var tx = new EthPrivateTransaction();
        var txType = '01';
        tx.selector = data.slice(0, 10);
        tx.nullifier = data.slice(10, 74);
        tx.outCommit = data.slice(74, 138);
        tx.transferIndex = 'txData.secret.tx.output.account.i';
        tx.eneryAmount = 'txData.secret.tx.output.account.e';
        tx.tokenAmount = "0000000000000000";
        tx.transactProof = 'formatProof(proof.proof)';
        tx.rootAfter = 'rand_fr_hex()';
        tx.treeProof = 'rand_fr_hex_list(8)';
        tx.txType = txType;
        tx.memoSize = 'txData.memo.length.toString(16).slice()';
        tx.memoFee = "0000000000000000";
        tx.memoMessage = 'rand_bigint_hex(parseInt(memo_size, 16) - memo_fee.length / 2)';
        return tx;
    };
    return EthPrivateTransaction;
}());
export { EthPrivateTransaction };
function formatProof(proof) {
    var a = proof.a.map(function (num) { return BigInt(num).toString(16); }).join();
    var b = proof.b.flat().map(function (num) { return BigInt(num).toString(16); }).join();
    var c = proof.c.map(function (num) { return BigInt(num).toString(16); }).join();
    return [a, b, c].join('');
}
//# sourceMappingURL=private-tx.js.map