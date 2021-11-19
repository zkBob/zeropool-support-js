import { hash } from 'tweetnacl';
import { UserAccount, UserState } from "../libzeropool-rs";
import { bufToHex } from "../utils";
export class ZeroPoolState {
    static async create(sk, coinName, denominator) {
        const zpState = new ZeroPoolState();
        zpState.denominator = denominator;
        const userId = bufToHex(hash(sk));
        const state = await UserState.init(`zp.${coinName}.${userId}`);
        try {
            const acc = new UserAccount(sk, state);
            zpState.privateAccount = acc;
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
        const total = BigInt(this.privateAccount.totalBalance()) * this.denominator;
        const acc = BigInt(this.privateAccount.accountBalance()) * this.denominator;
        const note = BigInt(this.privateAccount.noteBalance()) * this.denominator;
        return [total.toString(), acc.toString(), note.toString()];
    }
}
//# sourceMappingURL=state.js.map