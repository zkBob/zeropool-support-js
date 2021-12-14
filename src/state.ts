import { hash } from 'tweetnacl';

import { UserAccount, UserState } from '@/libzeropool-rs';
import { bufToHex } from '@/utils';

export class ZeroPoolState {
    public denominator: bigint;
    public account: UserAccount;

    public static async create(sk: Uint8Array, coinName: string, denominator: bigint): Promise<ZeroPoolState> {
        const zpState = new ZeroPoolState();
        zpState.denominator = denominator;
        const userId = bufToHex(hash(sk));
        const state = await UserState.init(`zp.${coinName}.${userId}`);

        try {
            const acc = new UserAccount(sk, state);
            zpState.account = acc;
        } catch (e) {
            console.error(e);
        }

        return zpState;
    }

    public getTotalBalance(): string {
        return this.getBalances()[0];
    }

    public getBalances(): [string, string, string] {
        const total = BigInt(this.account.totalBalance()) * this.denominator;
        const acc = BigInt(this.account.accountBalance()) * this.denominator;
        const note = BigInt(this.account.noteBalance()) * this.denominator;

        return [total.toString(), acc.toString(), note.toString()];
    }

    public free(): void {
        this.account.free();
    }
}
