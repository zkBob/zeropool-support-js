import { expose } from 'comlink';
import { Proof, default as init } from 'libzeropool-rs-wasm-web';
import wasm from 'libzeropool-rs-wasm-web/libzeropool_rs_wasm_bg.wasm'; // FIXME: dynamic init

(async () => {
  await init(wasm);

  const obj = {
    async initWasm(path) {
      await init(path);
    },

    async prooveTx(params, pub, sec) {
      new Promise(async resolve => {
        const result = Proof.tx(params, pub, sec);
        resolve(result);
      });
    },

    async prooveTree(params, pub, sec) {
      new Promise(async resolve => {
        const result = Proof.tree(params, pub, sec);
        resolve(result);
      });
    },
  };

  expose(obj);
})();
