import { TxStatus } from '../transaction';
export function convertTransaction(tx, timestamp, customStatus) {
    return {
        status: customStatus || TxStatus.Completed,
        amount: tx.value,
        from: tx.from,
        to: tx.to || '',
        timestamp: timestamp,
        blockHash: tx.blockHash || '',
        hash: tx.hash,
    };
}
//# sourceMappingURL=utils.js.map