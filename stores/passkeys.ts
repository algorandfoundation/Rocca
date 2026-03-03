import type { PasskeyStoreState } from "@/extensions/passkeys";
import {Store} from "@tanstack/react-store";

export const passkeyStore = new Store<PasskeyStoreState>({
    passkeys: [],
})