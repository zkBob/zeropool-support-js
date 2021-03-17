import bip39 from 'bip39-light';
import * as HDKey from 'hdkey';
import { derivePath } from 'ed25519-hd-key';
import { sign, SignKeyPair } from 'tweetnacl';
import { CoinType } from './coins/coin-type';

export { HDKey as Secp256k1HDKey };

export function preprocessMnemonic(mnemonic: string): string {
  return mnemonic
    .trim()
    .split(/\s+/)
    .map(part => part.toLowerCase())
    .join(' ');
}

export function generateMnemonic(): string {
  return bip39.generateMnemonic();
}

export function deriveEd25519(coin: CoinType, mnemonic: string, account: number): SignKeyPair {
  const processed = preprocessMnemonic(mnemonic);
  const path = CoinType.derivationPath(coin, account);
  const seed = bip39.mnemonicToSeed(processed);
  const { key } = derivePath(path, seed.toString('hex'));
  const naclKeypair = sign.keyPair.fromSeed(key);

  return naclKeypair;
}

export function validateMnemonic(mnemonic: string): boolean {
  try {
    bip39.mnemonicToEntropy(mnemonic);
    return true;
  } catch (e) {
    return false;
  }
}
