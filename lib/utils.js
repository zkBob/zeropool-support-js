"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufToHex = void 0;
const HEX_TABLE = [];
for (let n = 0; n <= 0xff; ++n) {
    const octet = n.toString(16).padStart(2, '0');
    HEX_TABLE.push(octet);
}
function bufToHex(buffer) {
    const octets = new Array(buffer.length);
    for (let i = 0; i < buffer.length; ++i)
        octets[i] = (HEX_TABLE[buffer[i]]);
    return octets.join('');
}
exports.bufToHex = bufToHex;
//# sourceMappingURL=utils.js.map