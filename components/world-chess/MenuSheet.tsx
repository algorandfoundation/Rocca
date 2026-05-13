import SessionDebug from '@/components/world-chess/SessionDebug';
import { type UseSessionResult } from '@/hooks/useSession';
import theme from '@/theme/theme';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';

interface MenuSheetProps {
  onDismiss: () => void;
  onLogout: () => void;
  session: UseSessionResult;
}

const MenuSheet = forwardRef<BottomSheetModal, MenuSheetProps>(
  ({ onDismiss, onLogout, session }, ref) => {
    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['30%']}
        index={0}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.semantic.bg['surface-1'] }}
        handleIndicatorStyle={{ display: 'none' }}
      >
        <BottomSheetView
          style={{
            paddingHorizontal: theme.primitives.spacing['16'],
            paddingBottom: theme.primitives.spacing['32'],
          }}
        >
          {/* Header row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.primitives.spacing['16'],
              position: 'relative',
            }}
          >
            <Text
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                color: theme.semantic.fg['high-emphasis'] as string,
                fontSize: theme.primitives.font.size['p-md'],
                fontFamily: theme.primitives.font.family.p,
                textAlign: 'center',
              }}
            >
              Menu
            </Text>
            <Pressable onPress={onDismiss} hitSlop={8}>
              <Text
                style={{
                  color: theme.semantic.fg['brand-secondary'] as string,
                  fontSize: theme.primitives.font.size['p-lg'],
                  fontFamily: theme.primitives.font.family.p,
                  marginLeft: theme.primitives.spacing['8'],
                }}
              >
                Cancel
              </Text>
            </Pressable>
          </View>

          <SessionDebug session={session} />

          <Pressable
            onPress={onLogout}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.primitives.spacing['12'],
              paddingHorizontal: theme.primitives.spacing['16'],
              paddingVertical: theme.primitives.spacing['16'],
              backgroundColor: theme.semantic.bg['surface-1'],
              borderRadius: theme.primitives.radius['4'],
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons
              name="log-out-outline"
              size={24}
              color={theme.semantic.fg['brand-secondary']}
            />
            <Text
              style={{
                color: theme.semantic.fg['brand-secondary'] as string,
                fontSize: theme.primitives.font.size['p-lg'],
                fontFamily: theme.primitives.font.family.p,
              }}
            >
              Log out
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

MenuSheet.displayName = 'MenuSheet';

export default MenuSheet;
