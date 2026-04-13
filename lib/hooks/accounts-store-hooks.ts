import { Account } from '@/extensions/accounts/types';
import { encodeAddress } from '@algorandfoundation/keystore';
import Hook from 'before-after-hook';
import { getAlgorandBalances } from '../algorand';

const accountStoreHooks = new Hook.Collection();

/**
 * Before hook for adding an account to the account store.
 *
 * This hook checks if the account being added is a keystore account. If so, it fetches the
 * account balance and assets from the Algorand blockchain and updates the account object before
 * it is added to the store.
 */
accountStoreHooks.before('add', async (options) => {
  const { account: beforeAccount }: { account: Account } = options;

  // only check keystore accounts
  if (beforeAccount.type === 'keystore-account') {
    const address = encodeAddress(Buffer.from(beforeAccount.address, 'base64'));

    let r: { balance: bigint; assets?: Account['assets'] };

    // lookup accounts balances, assets
    try {
      r = await getAlgorandBalances(address);
    } catch (error) {
      console.error(
        '[accounts-store-hooks] failed to fetch account balance and assets for address',
        address,
        error,
      );
      return;
    }

    const { balance, assets } = r;

    // update account in store with balance and assets
    options.account = {
      ...beforeAccount,
      balance,
      assets,
    };

    console.debug(
      '[accounts-store-hooks] modified account with balance and assets:',
      options.account,
    );
  }
});

export { accountStoreHooks };
