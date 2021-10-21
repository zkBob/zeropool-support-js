import bip39 from 'bip39-light';
import { preprocessMnemonic, Secp256k1HDKey } from '../../utils';
import { CoinType } from '../coin-type';
export class CachedAccount {
    constructor(keypair, web3) {
        this.keypair = keypair;
        const privateKey = '0x' + this.keypair.privateKey.toString('hex');
        this.account = web3.eth.accounts.privateKeyToAccount(privateKey);
    }
}
export class AccountCache {
    constructor(mnemonic, web3) {
        this.accounts = [];
        const processed = preprocessMnemonic(mnemonic);
        // validate mnemonic
        bip39.mnemonicToEntropy(processed);
        const path = CoinType.chainPath(CoinType.ethereum);
        const seed = bip39.mnemonicToSeed(processed);
        const hdkey = Secp256k1HDKey.fromMasterSeed(seed);
        this.root = hdkey.derive(path);
        this.web3 = web3;
    }
    getOrCreate(accountNumber) {
        let account = this.accounts[accountNumber];
        if (account) {
            return account;
        }
        const keypair = this.root.derive('m' + CoinType.accountPath(CoinType.ethereum, accountNumber));
        account = new CachedAccount(keypair, this.web3);
        this.accounts[accountNumber] = account;
        return account;
    }
}
//# sourceMappingURL=account.js.map