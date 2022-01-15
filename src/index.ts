if (typeof localStorage === 'undefined' || localStorage === null) {
  const LocalStorage = require('node-localstorage').LocalStorage;
  global.localStorage = new LocalStorage('./tmp');
}

export { NetworkType } from './networks/network-type';
export { Network, Balance } from './networks/network';
export { HDWallet } from './hd-wallet';
export { validateAddress, init } from './libzeropool-rs';

// For convenience
export { default as devConfig } from './config.dev';
export { default as prodConfig } from './config.prod';

