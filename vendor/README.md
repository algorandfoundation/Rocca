# Vendored packages

Interim home for the split keystore packages and the passkey AutoFill module
until they are published to npm.

The monolithic `@algorandfoundation/keystore` was split into
`@algorandfoundation/keystore-core` (platform-agnostic engine) plus one adapter
per platform; this app consumes `keystore-core` and
`@algorandfoundation/react-native-keystore`. Both currently only exist in the
[`wallet-provider-extensions`](https://github.com/algorandfoundation/wallet-provider-extensions)
repository — npm still carries a `0.0.1-beta.0` placeholder for `keystore-core`.

They are vendored as tarballs rather than referenced as `file:../…` directories
for two reasons:

- `pnpm pack` rewrites the workspace-only `catalog:` / `workspace:` specifiers in
  those manifests into concrete versions, which npm can resolve.
- npm installs a `file:` **directory** as a symlink, and Metro refuses to resolve
  a module whose real path lies outside the project root (it is not in
  `watchFolders`), so `expo export` / `expo start` fails. A tarball is extracted
  into `node_modules/` as a real directory and bundles normally.

Regenerate them after changing the keystore source:

```bash
cd ../wallet-provider-extensions
pnpm install
pnpm --filter @algorandfoundation/keystore-core build
pnpm --filter @algorandfoundation/react-native-keystore build
(cd keystore/core && pnpm pack --pack-destination ../../../Rocca/vendor)
(cd keystore/react-native && pnpm pack --pack-destination ../../../Rocca/vendor)
cd ../Rocca && npm install
```

`pnpm pack` names the tarball after the version in the package manifest, so a
version bump produces a _new_ file: update the matching `file:vendor/…tgz` specs
in `package.json` to the new names and delete the superseded tarballs, otherwise
npm keeps installing the old copy.

The `overrides["@algorandfoundation/keystore-core"]` entry in `package.json`
points the copy that `react-native-keystore` asks for at the same tarball, since
that version is not on npm yet.

## `react-native-passkey-autofill`

Vendored for the same reason, but from the
[`react-native-passkey-autofill`](https://github.com/algorandfoundation/react-native-passkey-autofill)
repository: the published `1.0.0-canary.22` still derives passkeys from the
BIP32-Ed25519 account root and reads the pre-split MMKV record layout, so on this
app's keystore every passkey creation fails with "HD Root Key not available".
The fix is entirely in the module's **native** code (`android/src/main`, `ios/`),
which only ships inside the package — a JS-only workaround is not possible.

```bash
cd ../react-native-passkey-autofill
pnpm install
pnpm run build
pnpm pack --pack-destination ../Rocca/vendor
cd ../Rocca && npm install
```

That module vendors the keystore tarballs itself, for its own example app and
tests. `.npmignore` keeps `vendor/` out of the pack, because a `file:` spec
relative to the module would otherwise install a SECOND copy of the native
keystore module; the
`overrides["@algorandfoundation/react-native-passkey-autofill"]` entry in
`package.json` resolves its keystore dependency to the same tarball this app
uses, so exactly one native keystore is autolinked.

Because the native sources come from the tarball, a version bump needs a
`prebuild`/native rebuild — reinstalling alone does not update an already-built
APK.

## Native patch

`react-native-keystore` no longer caches the unlocked master key in JS: repeat
biometric prompts are suppressed by the OS instead, through the
`authenticationValidityDuration` option this app sets in `app/_layout.tsx`.
`react-native-keychain@10.0.0` has no API for it, so
`patches/react-native-keychain+10.0.0.patch` (applied by `patch-package` on
`postinstall`) adds it. Keep it in sync with the pnpm-format copy in
`wallet-provider-extensions/patches/`; without the patch the option is silently
ignored and every keystore operation prompts again.

Once the packages are released, delete this directory, drop that override and
depend on the published versions instead.
