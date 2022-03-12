"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolkadotClient = void 0;
require("@polkadot/api-augment/substrate");
const api_1 = require("@polkadot/api");
const keyring_1 = require("@polkadot/keyring");
const util_1 = require("@polkadot/util");
const util_crypto_1 = require("@polkadot/util-crypto");
const client_1 = require("../../networks/client");
const utils_1 = require("../../utils");
class PolkadotClient extends client_1.Client {
    static async create(account, rpcUrl) {
        await (0, util_crypto_1.cryptoWaitReady)();
        const client = new PolkadotClient();
        client.keyring = new keyring_1.Keyring({ type: 'sr25519' });
        client.account = client.keyring.addFromUri(account);
        const wsProvider = new api_1.WsProvider(rpcUrl);
        client.api = await api_1.ApiPromise.create({ provider: wsProvider });
        return client;
    }
    async getAddress() {
        return this.account.address;
    }
    async getPublicKey() {
        return (0, utils_1.bufToHex)(this.account.publicKey);
    }
    async getBalance() {
        // TODO: What to do with the reserved balance?
        // @ts-ignore
        const { data: { free } } = await this.api.query.system.account(this.account.address);
        return free.toString();
    }
    async transfer(to, amount) {
        await this.api.tx.balances.transfer(to, amount)
            .signAndSend(this.account);
    }
    /**
     * Converts DOT to Planck.
     * @param amount in Ether
     */
    toBaseUnit(amount) {
        return amount; // FIXME: How to properly implement these methods? Use a configurable denominator?
    }
    /**
     * Converts Planck to DOT.
     * @param amount in Wei
     */
    fromBaseUnit(amount) {
        return amount; // FIXME:
    }
    // public async estimateTxFee(): Promise<TxFee> {
    // }
    async mint(tokenAddress, amount) {
        const alice = this.keyring.addFromUri('//Alice');
        // @ts-ignore
        const { nonce } = await this.api.query.system.account(alice.address);
        await this.api.tx.sudo
            .sudo(this.api.tx.balances.setBalance(this.account.address, amount, '0'))
            .signAndSend(alice, { nonce });
    }
    async sign(data) {
        const message = (0, util_1.stringToU8a)(data);
        const signature = (0, util_1.u8aToHex)(this.account.sign(message));
        return signature;
    }
}
exports.PolkadotClient = PolkadotClient;
//# sourceMappingURL=client.js.map