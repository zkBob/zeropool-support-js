export interface RelayerInfo {
    numTransactions: number; // TODO: Use BigInt?
    numFinalTransactions: number;
    time: number;
}

export class RelayerAPI {
    url: URL;

    constructor(url: URL) {
        this.url = url;
    }

    async fetchLeaves(offset: BigInt, limit: BigInt = BigInt(100)): Promise<Int8Array[]> {
        console.warn('Called a mock RelayerAPI method: fetchLeaves');
        return [];
    }

    async sendTransaction(data: string): Promise<void> {
        console.warn('Called a mock RelayerAPI method: sendTransaction');
    }

    async info(): Promise<RelayerInfo> {
        console.warn('Called a mock RelayerAPI method: info');
        return {
            numTransactions: 0,
            numFinalTransactions: 0,
            time: Date.now() + 1000 * 60 * 60 * 24,
        };
    }
}
