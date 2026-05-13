import Button from '@/components/world-chess/Button';
import theme from '@/theme/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getParamValue(value: string | string[] | undefined, fallback = ''): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export function PurchaseEntry() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    slug?: string | string[];
    version?: string | string[];
    name?: string | string[];
    address?: string | string[];
    assetId?: string | string[];
    amount?: string | string[];
    banner?: string | string[];
  }>();

  const slug = getParamValue(params.slug, 'chess-passport');
  const version = getParamValue(params.version, '1');
  const name = getParamValue(params.name, 'Unknown tournament');
  const address = getParamValue(params.address, 'Unknown address');
  const assetId = getParamValue(params.assetId, 'N/A');
  const amount = getParamValue(params.amount, '0');
  const banner = getParamValue(params.banner);

  useEffect(() => {
    console.log('[purchase-entry] blockchain metadata', {
      slug,
      version,
      address,
      assetId,
      banner,
    });
  }, [address, assetId, banner, slug, version]);

  const onConfirm = () => {
    Alert.alert('Success', 'You have successfully purchased entry into this tournament.');
  };

  const onDecline = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        {banner ? (
          <Image source={{ uri: banner }} style={styles.bannerImage} resizeMode="cover" />
        ) : null}
        <Text style={styles.title}>Purchase Tournament Entry</Text>
        <Text style={styles.subtitle}>Review QR details before continuing.</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Tournament</Text>
          <Text style={styles.value}>{name}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Cost</Text>
          <Text style={styles.value}>{amount} World Chess Coins</Text>
        </View>

        <Text style={styles.prompt}>Would you like to purchase entry into this tournament?</Text>

        <View style={styles.actions}>
          <Button label="No" variant="secondary" onPress={onDecline} />
          <View style={styles.spacer} />
          <Button label="Yes" variant="primary" onPress={onConfirm} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: theme.primitives.spacing['16'],
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.semantic.bg['surface-1'] as string,
    borderRadius: theme.primitives.radius['12'],
    borderWidth: 1,
    borderColor: theme.semantic.stroke['low-emphasis'] as string,
    padding: theme.primitives.spacing['16'],
    gap: theme.primitives.spacing['12'],
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  bannerImage: {
    width: '100%',
    height: 140,
    borderRadius: theme.primitives.radius['8'],
    marginBottom: theme.primitives.spacing['4'],
  },
  title: {
    color: theme.semantic.fg['high-emphasis'] as string,
    fontFamily: theme.primitives.font.family.header,
    fontSize: theme.primitives.font.size['h4'],
  },
  subtitle: {
    color: theme.semantic.fg['medium-emphasis'] as string,
    fontFamily: theme.primitives.font.family.p,
    fontSize: theme.primitives.font.size['p-sm'],
  },
  row: {
    gap: theme.primitives.spacing['4'],
  },
  label: {
    color: theme.semantic.fg['medium-emphasis'] as string,
    fontFamily: theme.primitives.font.family.p,
    fontSize: theme.primitives.font.size['p-sm'],
  },
  value: {
    color: theme.semantic.fg['high-emphasis'] as string,
    fontFamily: theme.primitives.font.family.p,
    fontSize: theme.primitives.font.size['p-md'],
  },
  prompt: {
    color: theme.semantic.fg['high-emphasis'] as string,
    fontFamily: theme.primitives.font.family.p,
    fontSize: theme.primitives.font.size['p-md'],
    marginTop: theme.primitives.spacing['8'],
  },
  actions: {
    marginTop: theme.primitives.spacing['8'],
  },
  spacer: {
    height: theme.primitives.spacing['8'],
  },
});

export default PurchaseEntry;
