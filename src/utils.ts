import bip39 from 'bip39-light';
import * as HDKey from 'hdkey';

import { CoinType } from './coins/coin-type';

export { HDKey };

// TODO: Utilize bip32 hierarchy instead of calling this method each time a private key is needed.
export function parseSeedPhrase(mnemonic: string, coin: CoinType, accountIdx: number): HDKey {
  const words = mnemonic
    .trim()
    .split(/\s+/)
    .map(part => part.toLowerCase())
    .join(' ');

  // validate mnemonic
  bip39.mnemonicToEntropy(words);

  const path = CoinType.derivationPath(coin, accountIdx);
  const seed = bip39.mnemonicToSeed(words);
  const hdkey = HDKey.fromMasterSeed(seed);
  const child = hdkey.derive(path);

  return child;
}

export function generateMnemonic(): string {
  return bip39.generateMnemonic();
}
