// console.log(require);

// require('./node_modules/libzeropool-rs-wasm-nodejs');
// require('./node_modules/libzeropool-rs-wasm-bundler');
const Web3 = require('web3');

const zp = require('./node');
const { EthereumNetwork } = require('./node/networks/ethereum/network');
const { DirectBackend } = require('./node/network/ethereum/backends/direct');
const config = require('./node/config.dev');

const web3 = new Web3('http://127.0.0.1:8545');
const zpBackend = new DirectBackend(web3,)

console.log(zp.devConfig);

const test = new EthereumNetwork('crazy appear raise time fashion kind pattern crazy device split escape wolf', web3, zp.devConfig.ethereum);
