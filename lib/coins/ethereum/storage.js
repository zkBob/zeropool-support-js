export class LocalTxStorage {
    constructor(prefix) {
        this.prefix = prefix;
    }
    add(address, tx) {
        const txs = this.list(address);
        txs.unshift(tx);
        localStorage.setItem(`${this.prefix}.${address}`, JSON.stringify(txs));
    }
    list(address) {
        const data = localStorage.getItem(`${this.prefix}.${address}`);
        if (!data) {
            return [];
        }
        return JSON.parse(data);
    }
}
//# sourceMappingURL=storage.js.map