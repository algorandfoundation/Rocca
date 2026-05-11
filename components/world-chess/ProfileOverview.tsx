import Button from '@/components/world-chess/Button';
import StatCard from '@/components/world-chess/StatCard';
import theme from '@/theme/theme';
import MaterialIcons from '@expo/vector-icons/build/MaterialIcons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useRef } from 'react';
import { Image, ImageSourcePropType, Pressable, Text, View } from 'react-native';

interface ProfileOverviewProps {
  name: string;
  eloRating: number;
  progressPoints: bigint;
  avatar: ImageSourcePropType;
  onSharePress?: () => void;
}

export default function ProfileOverview({
  name,
  eloRating,
  progressPoints,
  avatar,
}: ProfileOverviewProps) {
  const shareSheetRef = useRef<BottomSheetModal>(null);

  const onSharePress = useCallback(() => {
    shareSheetRef.current?.present();
  }, []);

  const onCancelPress = useCallback(() => {
    shareSheetRef.current?.dismiss();
  }, []);

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
    <View style={{ width: '100%', marginBottom: theme.primitives.spacing['24'] }}>
      {/* Top: Profile / Name box */}
      <View
        style={{
          width: '100%',
          alignItems: 'center',
          paddingHorizontal: theme.primitives.spacing['16'],
          paddingVertical: theme.primitives.spacing['16'],
          backgroundColor: theme.semantic.bg['surface-1'],
          borderRadius: theme.primitives.radius['4'],
          gap: theme.primitives.spacing['8'],
        }}
      >
        <Image
          source={avatar}
          style={{
            width: 64,
            height: 64,
            borderRadius: theme.primitives.radius['32'],
          }}
          resizeMode="cover"
        />
        <Text
          style={{
            color: theme.semantic.fg['high-emphasis'] as string,
            fontSize: theme.primitives.font.size.h4,
            fontFamily: theme.primitives.font.family.header,
          }}
        >
          {name}
        </Text>
        <Button
          variant="secondary"
          label="Share Profile"
          size="small"
          onPress={onSharePress}
          leftIcon={
            <MaterialIcons name="qr-code" size={14} color={theme.semantic.fg['brand-primary']} />
          }
        />
      </View>

      {/* Gap */}
      <View style={{ height: theme.primitives.spacing['8'] }} />

      {/* Bottom: Stats side by side */}
      <View style={{ flexDirection: 'row', gap: theme.primitives.spacing['8'] }}>
        <StatCard label="ELO Rating" value={eloRating.toString()} />
        <StatCard label="Progress Points" value={progressPoints.toString()} />
      </View>
      <BottomSheetModal
        ref={shareSheetRef}
        snapPoints={['50%']}
        index={0}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.semantic.bg['surface-1'] }}
        handleIndicatorStyle={{ backgroundColor: theme.semantic.fg['low-emphasis'] }}
      >
        <BottomSheetView
          style={{
            paddingHorizontal: theme.primitives.spacing['16'],
            paddingTop: theme.primitives.spacing['8'],
            paddingBottom: theme.primitives.spacing['32'],
          }}
        >
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
              Share Profile
            </Text>
            <Pressable onPress={onCancelPress} hitSlop={8}>
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

          <View
            style={{
              width: '100%',
              alignItems: 'center',
              paddingHorizontal: theme.primitives.spacing['16'],
              paddingVertical: theme.primitives.spacing['16'],
              backgroundColor: theme.semantic.bg['surface-1'],
              borderRadius: theme.primitives.radius['4'],
              gap: theme.primitives.spacing['8'],
            }}
          >
            <Image
              source={avatar}
              style={{
                width: 64,
                height: 64,
                borderRadius: theme.primitives.radius['32'],
              }}
              resizeMode="cover"
            />
            <Text
              style={{
                color: theme.semantic.fg['high-emphasis'] as string,
                fontSize: theme.primitives.font.size.h4,
                fontFamily: theme.primitives.font.family.header,
              }}
            >
              {name}
            </Text>
          </View>
          {/* Mock QR Code */}
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: theme.primitives.spacing['16'],
            }}
          >
            <View
              style={{
                width: 160,
                height: 160,
                backgroundColor: theme.semantic.fg['high-emphasis'] as string,
                borderRadius: theme.primitives.radius['2'],
                padding: 4,
              }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.semantic.bg['surface-1'] as string,
                  flexDirection: 'column',
                }}
              >
                {Array.from({ length: 8 }).map((_, row) => (
                  <View key={row} style={{ flex: 1, flexDirection: 'row' }}>
                    {Array.from({ length: 8 }).map((_, col) => (
                      <View
                        key={`${row}-${col}`}
                        style={{
                          flex: 1,
                          backgroundColor:
                            Math.random() > 0.4
                              ? (theme.semantic.fg['high-emphasis'] as string)
                              : 'transparent',
                          margin: 1,
                        }}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
