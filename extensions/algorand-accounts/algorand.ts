import { AccountAsset } from '@/extensions/accounts';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';

/**
 * Get Algorand account balance and assets for a given address.
 * @param algorand - The AlgorandClient instance to use
 * @param address - The Algorand account address to query.
 * @returns An object containing the account balance in microAlgos and an optional list of assets.
 * @throws Will throw an error if the account information cannot be retrieved from Algod.
 */
export const getAlgorandBalances = async (
  algorand: AlgorandClient,
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
