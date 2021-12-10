"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumCoin = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const utils_1 = require("../../utils");
const coin_1 = require("../coin");
const coin_type_1 = require("../coin-type");
const transaction_1 = require("../transaction");
const utils_2 = require("./utils");
const storage_1 = require("./storage");
const account_1 = require("./account");
const private_tx_1 = require("./private-tx");
const token_abi_json_1 = __importDefault(require("./token-abi.json"));
// TODO: Organize presistent state properly
const TX_STORAGE_PREFIX = 'zeropool.eth-txs';
const STATE_STORAGE_PREFIX = 'zeropool.eth.state';
class EthereumCoin extends coin_1.Coin {
    constructor(mnemonic, web3, config, relayer, worker) {
        super(mnemonic, worker);
        this.web3 = web3;
        this.txStorage = new storage_1.LocalTxStorage(TX_STORAGE_PREFIX);
        this.accounts = new account_1.AccountCache(mnemonic, this.web3);
        this.erc20 = new this.web3.eth.Contract(token_abi_json_1.default);
        this.config = config;
        this.relayer = relayer;
    }
    async init() {
        await super.init();
        await this.updatePrivateState();
    }
    getPrivateKey(account) {
        return this.accounts.getOrCreate(account).account.privateKey;
    }
    getPublicKey(account) {
        return this.accounts.getOrCreate(account).keypair.publicKey.toString('hex');
    }
    getAddress(account) {
        return this.accounts.getOrCreate(account).account.address;
    }
    async getBalance(account) {
        return await this.web3.eth.getBalance(this.getAddress(account));
    }
    async getTokenBalance(account, tokenAddress) {
        const address = this.getAddress(account);
        const balance = await this.erc20.methods.balanceOf(address).call({ from: address, to: tokenAddress });
        return balance;
    }
    async transfer(account, to, amount) {
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
        }, this.getPrivateKey(account));
        const receipt = await this.web3.eth.sendSignedTransaction(signed.rawTransaction);
        const block = await this.web3.eth.getBlock(receipt.blockNumber);
        let timestamp;
        if (typeof block.timestamp == 'string') {
            timestamp = parseInt(block.timestamp);
        }
        else {
            timestamp = block.timestamp;
        }
        let status = transaction_1.TxStatus.Completed;
        if (!receipt.status) {
            status = transaction_1.TxStatus.Error;
        }
        const nativeTx = await this.web3.eth.getTransaction(receipt.transactionHash);
        const tx = (0, utils_2.convertTransaction)(nativeTx, timestamp, status);
        this.txStorage.add(this.getAddress(account), tx);
    }
    async getTransactions(account, limit, offset) {
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
    toBaseUnit(amount) {
        return this.web3.utils.toWei(amount, 'ether');
    }
    /**
     * Converts Wei to ether.
     * @param amount in Wei
     */
    fromBaseUnit(amount) {
        return this.web3.utils.fromWei(amount, 'ether');
    }
    async estimateTxFee() {
        const gas = await this.web3.eth.estimateGas({
            from: this.getAddress(0),
            to: this.getAddress(0),
            value: this.toBaseUnit('1'),
        });
        const gasPrice = await this.web3.eth.getGasPrice();
        const fee = new bn_js_1.default(gas).mul(new bn_js_1.default(gasPrice));
        return {
            gas: gas.toString(),
            gasPrice,
            fee: this.fromBaseUnit(fee.toString()),
        };
    }
    getCoinType() {
        return coin_type_1.CoinType.ethereum;
    }
    // deposit
    // transfer
    /**
     * coin.transferPublicToPrivate(0, [{ to: 'addr', amount: '123' }])
     * @param account
     * @param outputs
     */
    async transferPublicToPrivate(account, outputs) {
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
    async transferPrivateToPrivate(account, outs) {
        const privateKey = this.getPrivateKey(account);
        return this.relayer.transfer(privateKey, outs);
    }
    async depositPrivate(account, amount) {
        const privateKey = this.getPrivateKey(account);
        return this.relayer.deposit(privateKey, amount);
    }
    async withdrawPrivate(account, amount) {
        const privateKey = this.getPrivateKey(account);
        return this.relayer.withdraw(privateKey, amount);
    }
    getPrivateBalance() {
        return this.relayer.getTotalBalance();
    }
    getPrivateBalances() {
        return this.relayer.getBalances();
    }
    async updatePrivateState() {
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
    cachePrivateTx(raw) {
        const txData = private_tx_1.EthPrivateTransaction.decode(raw);
        const ciphertext = (0, utils_1.hexToBuf)(txData.ciphertext);
        const pair = this.privateAccount.decryptPair(ciphertext);
        const onlyNotes = this.privateAccount.decryptNotes(ciphertext);
        const reader = new utils_1.HexStringReader(txData.ciphertext);
        const numItems = reader.readNumber(4, true);
        const hashes = reader.readBigIntArray(numItems, 32, true).map(num => num.toString());
        console.log('Updating state', this.privateAccount.getWholeState());
        if (pair) {
            const notes = pair.notes.reduce((acc, note, index) => {
                acc.push({ note, index: Number(txData.transferIndex) + 1 + index });
                return acc;
            }, []);
            this.privateAccount.addAccount(txData.transferIndex, hashes, pair.account, notes);
        }
        else if (onlyNotes.length > 0) {
            this.privateAccount.addNotes(txData.transferIndex, hashes, onlyNotes);
        }
        else {
            // Temporarily cache everything
            // TODO: Remove when transitioning to relayer-only
            this.privateAccount.addHashes(txData.transferIndex, hashes);
        }
        console.log('New balance:', this.privateAccount.totalBalance());
        console.log('New state:', this.privateAccount.getWholeState());
    }
}
exports.EthereumCoin = EthereumCoin;
//# sourceMappingURL=coin.js.map