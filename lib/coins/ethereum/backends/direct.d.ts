import Web3 from 'web3';
import { Output, TransactionData } from "../../../libzeropool-rs";
import { ZeroPoolBackend } from "../../../zp/backend";
import { ZeroPoolState } from "../../../zp/state";
import { SnarkParams } from "../../../config";
import { Config } from '../config';
import { TxType } from '../private-tx';
export declare type TxDeposit = {
    txType: TxType.Deposit;
    signature: string;
    data: TransactionData;
};
export declare type TxTransfer = {
    txType: TxType.Transfer;
    data: TransactionData;
};
export declare type TxWithdraw = {
    txType: TxType.Withdraw;
    amount: string;
    data: TransactionData;
};
export declare type PrivateTx = TxDeposit | TxTransfer | TxWithdraw;
export declare class DirectBackend extends ZeroPoolBackend {
    private web3;
    private config;
    private snarkParams;
    private tokenContract;
    constructor(web3: Web3, snarkParams: SnarkParams, config: Config, state: ZeroPoolState, worker: any);
    deposit(privateKey: string, amountWei: string, fee?: string): Promise<void>;
    transfer(privateKey: string, outputs: Output[], fee?: string): Promise<void>;
    withdraw(privateKey: string, amount: string, fee?: string): Promise<void>;
    private approveAllowance;
    private signAndSendPrivateTx;
    getTotalBalance(): string;
    /**
     * @returns [total, account, note]
     */
    getBalances(): [string, string, string];
}
