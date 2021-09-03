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

    async fetchLeaves(offset: BigInt, limit: number = 100): Promise<string[]> {
        const url = new URL('/transactions', this.url);
        url.searchParams.set('offset', offset.toString());
        url.searchParams.set('limit', limit.toString());

        const res = await (await fetch(url.toString())).json();

        return res;
    }

    async sendTransaction(proof: string, memo: string): Promise<void> {
        const url = new URL('/transaction', this.url);
        const res = await fetch(url.toString(), { method: 'POST', body: JSON.stringify({ proof, memo }) });

        if (res.status !== 204) {
            const body = await res.json();
            throw new Error(`Error ${res.status}: ${JSON.stringify(body)}`)
        }
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
