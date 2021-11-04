var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { UserAccount, UserState } from "libzeropool-rs-wasm-bundler";
import { hash } from 'tweetnacl';
import { bufToHex } from "../utils";
export class ZeroPoolState {
    static create(sk, coinName, denominator) {
        return __awaiter(this, void 0, void 0, function* () {
            const zpState = new ZeroPoolState();
            zpState.denominator = denominator;
            const userId = bufToHex(hash(sk));
            const state = yield UserState.init(`zp.${coinName}.${userId}`);
            try {
                const acc = new UserAccount(sk, state);
                zpState.privateAccount = acc;
            }
            catch (e) {
                console.error(e);
            }
            return zpState;
        });
    }
    getTotalBalance() {
        return this.getBalances()[0];
    }
    getBalances() {
        const total = BigInt(this.privateAccount.totalBalance()) * this.denominator;
        const acc = BigInt(this.privateAccount.accountBalance()) * this.denominator;
        const note = BigInt(this.privateAccount.noteBalance()) * this.denominator;
        return [total.toString(), acc.toString(), note.toString()];
    }
}
//# sourceMappingURL=state.js.map