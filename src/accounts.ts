import { LocalAccount, LocalAccountStorage } from './local-account';

export const STORAGE_PREFIX = 'zeropool';

export class Accounts {
  store: LocalAccountStorage;
  accounts: { [name: string]: LocalAccount };

  constructor() {
    this.store = new LocalAccountStorage(STORAGE_PREFIX);
  }

  getAllAccounts(): string[] {
    return this.store.getAllAccounts();
  }

  getAccount(name: string): LocalAccount {
    return this.accounts[name];
  }

  addAccount(name: string, account: LocalAccount) {
    this.store.addAccount(name);
    this.accounts[name] = account;
  }
}
