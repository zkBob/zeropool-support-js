"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronClient = exports.EthereumClient = exports.Client = void 0;
var client_1 = require("./networks/client");
Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return client_1.Client; } });
var evm_1 = require("./networks/evm");
Object.defineProperty(exports, "EthereumClient", { enumerable: true, get: function () { return evm_1.EthereumClient; } });
var tron_1 = require("./networks/tron");
Object.defineProperty(exports, "TronClient", { enumerable: true, get: function () { return tron_1.TronClient; } });
//# sourceMappingURL=index.js.map