import { TransactionData, Params, UserAccount } from 'libzeropool-rs-wasm-bundler';
import Web3 from 'web3';
export declare enum TxType {
    Deposit = "00",
    Transfer = "01",
    Withdraw = "02"
}
export declare class EthPrivateTransaction {
    /** Hex encoded smart contract method id */
    selector: string;
    nullifier: bigint;
    outCommit: bigint;
    transferIndex: bigint;
    eneryAmount: bigint;
    tokenAmount: bigint;
    transactProof: bigint[];
    rootAfter: bigint;
    treeProof: bigint[];
    txType: TxType;
    memoSize: number;
    memo: string;
    static fromData(txData: TransactionData, txType: TxType, acc: UserAccount, params: Params, web3: Web3): EthPrivateTransaction;
    get ciphertext(): string;
    /**
     * Returns encoded transaction ready to use as data for the smart contract.
     */
    encode(): string;
    static decode(data: string): EthPrivateTransaction;
}
