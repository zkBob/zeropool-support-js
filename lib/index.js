"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumClient = exports.Client = void 0;
var client_1 = require("./networks/client");
Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return client_1.Client; } });
var client_2 = require("./networks/evm/client");
Object.defineProperty(exports, "EthereumClient", { enumerable: true, get: function () { return client_2.EthereumClient; } });
//# sourceMappingURL=index.js.map