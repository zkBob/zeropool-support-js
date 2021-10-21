var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class RelayerAPI {
    constructor(url) {
        this.url = url;
    }
    fetchLeaves(offset, limit = 100) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = new URL('/transactions', this.url);
            url.searchParams.set('offset', offset.toString());
            url.searchParams.set('limit', limit.toString());
            const res = yield (yield fetch(url.toString())).json();
            return res;
        });
    }
    sendTransaction(proof, memo) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = new URL('/transaction', this.url);
            const res = yield fetch(url.toString(), { method: 'POST', body: JSON.stringify({ proof, memo }) });
            if (res.status !== 204) {
                const body = yield res.json();
                throw new Error(`Error ${res.status}: ${JSON.stringify(body)}`);
            }
        });
    }
    info() {
        return __awaiter(this, void 0, void 0, function* () {
            console.warn('Called a mock RelayerAPI method: info');
            return {
                numTransactions: 0,
                numFinalTransactions: 0,
                time: Date.now() + 1000 * 60 * 60 * 24,
            };
        });
    }
}
//# sourceMappingURL=relayer.js.map