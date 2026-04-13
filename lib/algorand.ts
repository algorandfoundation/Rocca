import { AccountAsset } from '@/extensions/accounts';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';

const algodToken = process.env.EXPO_PUBLIC_ALGOD_TOKEN ?? '';
const algodServer = process.env.EXPO_PUBLIC_ALGOD_SERVER || 'https://mainnet-api.4160.nodely.dev';
const algodPort = process.env.EXPO_PUBLIC_ALGOD_PORT ?? '';

// Initialize Algorand client from environment variables
const algorand = AlgorandClient.fromConfig({
  algodConfig: {
    token: algodToken,
    server: algodServer,
    port: algodPort,
  },
});

/**
 * Get Algorand account balance and assets for a given address.
 * @param address - The Algorand account address to query.
 * @returns An object containing the account balance in microAlgos and an optional list of assets.
 * @throws Will throw an error if the account information cannot be retrieved from Algod.
 */
export const getAlgorandBalances = async (
  address: string,
): Promise<{ balance: bigint; assets?: AccountAsset[] }> => {
  const { balance, assets } = await algorand.account.getInformation(address);

  const accountAssets: AccountAsset[] | undefined = assets
    ? await Promise.all(
        assets.map(async (asset) => {
          const assetInfo = await algorand.asset.getById(asset.assetId);

          return {
            id: asset.assetId.toString(),
            name: assetInfo.assetName ?? '',
            type: 'asa',
            balance: asset.amount,
            metadata: {
              ...assetInfo,
            },
          };
        }),
      )
    : undefined;

  return {
    balance: balance.microAlgos,
    assets: accountAssets,
  };
};

export { algorand };
