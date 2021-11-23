import { expose } from 'comlink';
import { Proof, Params, default as init } from 'libzeropool-rs-wasm-web';

let txParams: Params;
let treeParams: Params;

(async () => {
  const obj = {
    async initWasm(url: string, paramUrls: { txParams: string; treeParams: string }) {
      await init(url);

      const txParamsData = await (await fetch(paramUrls.txParams)).arrayBuffer();
      txParams = Params.fromBinary(new Uint8Array(txParamsData));
      const treeParamsData = await (await fetch(paramUrls.treeParams)).arrayBuffer();
      treeParams = Params.fromBinary(new Uint8Array(treeParamsData));
    },

    async proveTx(pub, sec) {
      return new Promise(async resolve => {
        const result = Proof.tx(txParams, pub, sec);
        resolve(result);
      });
    },

    async proveTree(pub, sec) {
      return new Promise(async resolve => {
        const result = Proof.tree(treeParams, pub, sec);
        resolve(result);
      });
    },
  };

  expose(obj);
})();
