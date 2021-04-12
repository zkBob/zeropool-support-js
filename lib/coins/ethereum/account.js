import bip39 from 'bip39-light';
import { preprocessMnemonic, Secp256k1HDKey } from '../../utils';
import { CoinType } from '../coin-type';
var CachedAccount = /** @class */ (function () {
    function CachedAccount(keypair, web3) {
        this.keypair = keypair;
        var privateKey = '0x' + this.keypair.privateKey.toString('hex');
        this.account = web3.eth.accounts.privateKeyToAccount(privateKey);
    }
    return CachedAccount;
}());
export { CachedAccount };
var AccountCache = /** @class */ (function () {
    function AccountCache(mnemonic, web3) {
        this.accounts = [];
        var processed = preprocessMnemonic(mnemonic);
        // validate mnemonic
        bip39.mnemonicToEntropy(processed);
        var path = CoinType.chainPath(CoinType.ethereum);
        var seed = bip39.mnemonicToSeed(processed);
        var hdkey = Secp256k1HDKey.fromMasterSeed(seed);
        this.root = hdkey.derive(path);
        this.web3 = web3;
    }
    AccountCache.prototype.getOrCreate = function (accountNumber) {
        var account = this.accounts[accountNumber];
        if (account) {
            return account;
        }
        var keypair = this.root.derive('m' + CoinType.accountPath(CoinType.ethereum, accountNumber));
        account = new CachedAccount(keypair, this.web3);
        this.accounts[accountNumber] = account;
        return account;
    };
    return AccountCache;
}());
export { AccountCache };
//# sourceMappingURL=account.js.map