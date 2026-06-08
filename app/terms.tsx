import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';
import { Button } from '../components/Button';
import { AppText as Text } from '../components/Text';

export default function TermsScreen() {
  const router = useRouter();

  const handleAccept = async () => {
    // TODO: Save acceptance state to persistent storage

    // Dismiss the modal and send the user to the landing page
    router.replace('/landing');
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="body">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec diam nisl, commodo nec urna
          eget, vestibulum interdum elit. Nunc vehicula enim risus, sed sodales tellus iaculis vel.
          Fusce vel purus eget ligula consectetur fringilla molestie vel lectus. Donec scelerisque
          aliquam molestie. Curabitur egestas vulputate semper. Aliquam erat volutpat. Sed in
          sodales risus. Sed malesuada enim vitae pharetra maximus. Duis porta tempus quam, in
          efficitur sapien aliquet quis. In condimentum lorem ut volutpat pulvinar. Praesent
          consequat rhoncus orci, eget varius enim tristique eu. Suspendisse potenti.
        </Text>

        <Text variant="body">
          Integer eget ultrices nunc. Pellentesque orci ipsum, tristique in rhoncus eu, aliquam et
          nunc. Proin sodales, felis vitae faucibus maximus, urna elit laoreet est, vitae pretium
          nibh purus ut tellus. Cras lacinia consectetur dapibus. Interdum et malesuada fames ac
          ante ipsum primis in faucibus. Aenean at suscipit eros, ac mattis libero. Pellentesque ac
          rhoncus sem, ac interdum nisl. Mauris gravida convallis sapien at ultrices. Vestibulum
          quis facilisis ipsum. Maecenas vel lacinia ipsum, eget euismod nibh. Donec libero dolor,
          volutpat sed lectus varius, tempus sollicitudin felis. Ut ut sollicitudin felis. Vivamus
          augue mi, consequat sit amet cursus porttitor, pretium nec erat. Morbi interdum neque nec
          iaculis convallis.
        </Text>

        <Text variant="body">
          Nullam dictum, dui vitae finibus porttitor, est elit sodales lorem, sit amet faucibus nisl
          quam id sem. Quisque quis consequat mi. Quisque sed nulla blandit, pharetra velit nec,
          porta erat. Praesent id fermentum mauris. In imperdiet lorem quis dui vulputate lacinia.
          Donec non arcu sed erat eleifend vestibulum. Morbi est leo, dictum id sagittis ut, ornare
          in metus. Quisque sed neque sagittis, ultrices metus sed, fringilla nunc. In orci ante,
          blandit nec justo vitae, dapibus cursus justo. Cras quis nulla convallis, pharetra velit
          imperdiet, luctus dui. Ut sed velit vestibulum, fermentum lectus vitae, feugiat neque.
          Aenean at urna ac lacus feugiat dignissim. Sed feugiat elit faucibus, hendrerit leo quis,
          dignissim lacus. Maecenas pellentesque, lorem ut facilisis auctor, elit dolor ornare quam,
          non sodales diam sapien non ex. Donec ultrices ligula dolor, ac condimentum nunc euismod
          sit amet. Integer sit amet dui vel erat euismod sollicitudin.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Accept" onPress={handleAccept} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.semantic.bg.app,
    paddingHorizontal: theme.primitives.spacing.base,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: theme.primitives.spacing.sm,
    paddingBottom: theme.primitives.spacing.md,
    gap: theme.primitives.spacing.lg,
  },
  footer: {
    paddingTop: theme.primitives.spacing.sm,
    paddingBottom: theme.primitives.spacing.sm,
  },
}));
