// const isNode = typeof process !== 'undefined'
//   && process.versions != null
//   && process.versions.node != null;

// if (isNode) {
//   module.exports = require('libzeropool-rs-wasm-nodejs');
// }

export * from 'libzeropool-rs-wasm-web';
export { default as init } from 'libzeropool-rs-wasm-web';

