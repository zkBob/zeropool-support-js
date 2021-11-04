import { UserAccount, UserState } from "libzeropool-rs-wasm-bundler";
import { SnarkParams } from "../config";
import { hash } from 'tweetnacl';
import { bufToHex } from "../utils";

export class ZeroPoolState {
    public denominator: bigint;
    public privateAccount: UserAccount;

    public static async create(sk: Uint8Array, coinName: string, denominator: bigint): Promise<ZeroPoolState> {
        const zpState = new ZeroPoolState();
        zpState.denominator = denominator;
        const userId = bufToHex(hash(sk));
        const state = await UserState.init(`zp.${coinName}.${userId}`);

        try {
            const acc = new UserAccount(sk, state);
            zpState.privateAccount = acc;
        } catch (e) {
            console.error(e);
        }

        return zpState;
    }

    public getTotalBalance(): string {
        return this.getBalances()[0];
    }

    public getBalances(): [string, string, string] {
        const total = BigInt(this.privateAccount.totalBalance()) * this.denominator;
        const acc = BigInt(this.privateAccount.accountBalance()) * this.denominator;
        const note = BigInt(this.privateAccount.noteBalance()) * this.denominator;

        return [total.toString(), acc.toString(), note.toString()];
    }
}
