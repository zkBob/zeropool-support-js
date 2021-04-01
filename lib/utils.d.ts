import * as HDKey from 'hdkey';
import { SignKeyPair } from 'tweetnacl';
export { HDKey as Secp256k1HDKey };
export declare function preprocessMnemonic(mnemonic: string): string;
export declare function generateMnemonic(): string;
export declare function deriveEd25519(path: string, mnemonic: string, account: number): SignKeyPair;
export declare function validateMnemonic(mnemonic: string): boolean;
