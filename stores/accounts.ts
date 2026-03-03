import type { AccountStoreState } from "@/extensions/accounts";
import {Store} from "@tanstack/react-store";

export const accountsStore = new Store<AccountStoreState>({
    accounts: [],
})