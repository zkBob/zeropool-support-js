import { TransactionData, Params } from "libzeropool-rs-wasm-bundler";
import Web3 from "web3";
export declare enum TxType {
    Deposit = "00",
    Transfer = "01",
    Withdraw = "02"
}
export declare class EthPrivateTransaction {
    selector: string;
    nullifier: string;
    outCommit: string;
    transferIndex: string;
    eneryAmount: string;
    tokenAmount: string;
    transactProof: string;
    rootAfter: string;
    treeProof: string;
    txType: TxType;
    /** Memo block size */
    memoSize: string;
    /** Smart contract level metadata, only fee for 01 type */
    memoFee: string;
    /** Encrypted tx metadata, used on client only */
    memoMessage: string;
    static fromData(txData: TransactionData, params: Params, web3: Web3): EthPrivateTransaction;
    /**
     * Returns encoded transaction ready to use as data for the smart contract.
     */
    encode(): string;
    static decode(data: string): EthPrivateTransaction;
}
