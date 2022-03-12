
const HEX_TABLE: string[] = [];
for (let n = 0; n <= 0xff; ++n) {
    const octet = n.toString(16).padStart(2, '0');
    HEX_TABLE.push(octet);
}

export function bufToHex(buffer: Uint8Array): string {
    const octets = new Array(buffer.length);

    for (let i = 0; i < buffer.length; ++i)
        octets[i] = (HEX_TABLE[buffer[i]]);

    return octets.join('');
}