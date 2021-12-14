"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZeroPoolState = void 0;
const tweetnacl_1 = require("tweetnacl");
const libzeropool_rs_1 = require("./libzeropool-rs");
const utils_1 = require("./utils");
class ZeroPoolState {
    static async create(sk, coinName, denominator) {
        const zpState = new ZeroPoolState();
        zpState.denominator = denominator;
        const userId = (0, utils_1.bufToHex)((0, tweetnacl_1.hash)(sk));
        const state = await libzeropool_rs_1.UserState.init(`zp.${coinName}.${userId}`);
        try {
            const acc = new libzeropool_rs_1.UserAccount(sk, state);
            zpState.account = acc;
        }
        catch (e) {
            console.error(e);
        }
        return zpState;
    }
    getTotalBalance() {
        return this.getBalances()[0];
    }
    getBalances() {
        const total = BigInt(this.account.totalBalance()) * this.denominator;
        const acc = BigInt(this.account.accountBalance()) * this.denominator;
        const note = BigInt(this.account.noteBalance()) * this.denominator;
        return [total.toString(), acc.toString(), note.toString()];
    }
    free() {
        this.account.free();
    }
}
exports.ZeroPoolState = ZeroPoolState;
//# sourceMappingURL=state.js.map