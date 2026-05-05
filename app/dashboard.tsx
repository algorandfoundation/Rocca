import { VerifyIdentityBottomSheet } from '@/components/bottomsheets/verify-identity-bottomsheet';
import Button from '@/components/button';
import theme from '@/features/world-chess/theme/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type VerifiedState = 'not-verified' | 'pending' | 'verified';

const profile = {
  name: 'Magnus Carlsen',
  verified: 'not-verified' as VerifiedState,
  elo: '2830',
  asaRewards: '1240',
};

export default function Dashboard() {
  const router = useRouter();
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  return (
    <SafeAreaView
      style={{
        flex: 1,
        alignItems: 'center',
        backgroundColor: theme.semantic.bg['app-bg'] as string,
      }}
    >
      {/* Header */}
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: theme.primitives.spacing['16'],
          paddingHorizontal: theme.primitives.spacing['16'],
        }}
      >
        <Text
          style={{
            color: theme.semantic.fg['high-emphasis'] as string,
            fontSize: theme.primitives.font.size['h4'],
            fontFamily: theme.primitives.font.family.header,
          }}
        >
          Vault
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ marginRight: theme.primitives.spacing['16'] }}
            onPress={() => {}}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image
              source={require('../assets/images/icons/friends-icon.png')}
              style={{ width: 28, height: 28 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Image
              source={require('../assets/images/icons/scan-icon.png')}
              style={{ width: 28, height: 28 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>
      {/* Content */}
      <View
        style={{
          flex: 1,
          width: '100%',
          paddingHorizontal: theme.primitives.spacing['16'],
          paddingTop: theme.primitives.spacing['8'],
        }}
      >
        {/* Profile overview */}
        <View
          style={{
            width: '100%',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.9)',
            marginBottom: theme.primitives.spacing['24'],
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: theme.primitives.radius['6'],
          }}
        >
          <View
            style={{
              width: '100%',
              alignItems: 'center',
              paddingHorizontal: theme.primitives.spacing['16'],
              paddingVertical: theme.primitives.spacing['16'],
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.9)',
              borderRadius: theme.primitives.radius['6'],
            }}
          >
            <Image
              source={require('../assets/images/magnus-pfp.png')}
              style={{
                width: 64,
                height: 64,
                borderRadius: theme.primitives.radius['32'],
                marginBottom: theme.primitives.spacing['8'],
              }}
              resizeMode="cover"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={{
                  color: theme.semantic.fg['high-emphasis'] as string,
                  fontSize: theme.primitives.font.size.h5,
                  fontFamily: theme.primitives.font.family.header,
                }}
              >
                {profile.name}
              </Text>
              {profile.verified === 'verified' ? (
                <Image
                  source={require('../assets/images/icons/verified-icon.png')}
                  style={{
                    marginLeft: theme.primitives.spacing['8'],
                    width: 20,
                    height: 20,
                    tintColor: theme.semantic.fg['brand-secondary'] as string,
                  }}
                  resizeMode="contain"
                />
              ) : null}
            </View>
            {profile.verified === 'pending' && (
              <Text
                style={{
                  marginTop: theme.primitives.spacing['4'],
                  color: theme.semantic.fg.warning as string,
                  fontSize: theme.primitives.font.size['p-lg'],
                  fontFamily: theme.primitives.font.family.p,
                }}
              >
                Pending Verification
              </Text>
            )}
            {profile.verified === 'not-verified' && (
              <>
                <Text
                  style={{
                    marginTop: theme.primitives.spacing['4'],
                    color: theme.semantic.fg.error as string,
                    fontSize: theme.primitives.font.size['p-lg'],
                    fontFamily: theme.primitives.font.family.p,
                  }}
                >
                  Not Verified
                </Text>
                <View style={{ marginTop: theme.primitives.spacing['8'], width: '100%' }}>
                  <Button
                    label="Verify Identity"
                    variant="primary"
                    rightIcon={require('../assets/images/icons/chevron-right.png')}
                    onPress={() => setIsVerifyModalOpen(true)}
                  />
                </View>
              </>
            )}
          </View>
          <View style={{ width: '100%', flexDirection: 'row' }}>
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: theme.primitives.spacing['8'],
                paddingVertical: theme.primitives.spacing['8'],
                borderRightWidth: 1,
                borderRightColor: 'rgba(255,255,255,0.9)',
              }}
            >
              <Text
                style={{
                  color: theme.semantic.bg['brand-secondary'] as string,
                  fontSize: theme.primitives.font.size['display-lg'],
                  fontFamily: theme.primitives.font.family.numeric,
                  textAlign: 'center',
                }}
              >
                {profile.elo}
              </Text>
              <Text
                style={{
                  color: theme.semantic.fg['high-emphasis'] as string,
                  fontSize: theme.primitives.font.size['p-md'],
                  fontFamily: theme.primitives.font.family.p,
                  textAlign: 'center',
                }}
              >
                ELO Rating
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: theme.primitives.spacing['8'],
                paddingVertical: theme.primitives.spacing['8'],
              }}
            >
              <Text
                style={{
                  color: theme.semantic.bg['brand-secondary'] as string,
                  fontSize: theme.primitives.font.size['display-lg'],
                  fontFamily: theme.primitives.font.family.numeric,
                  textAlign: 'center',
                }}
              >
                {profile.asaRewards}
              </Text>
              <Text
                style={{
                  color: theme.semantic.fg['high-emphasis'] as string,
                  fontSize: theme.primitives.font.size['p-md'],
                  fontFamily: theme.primitives.font.family.p,
                  textAlign: 'center',
                }}
              >
                ASA Rewards
              </Text>
            </View>
          </View>
        </View>
        {/* Recent activity */}
        <View>
          {/* Last game */}
          <View style={{ marginBottom: theme.primitives.spacing['16'] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.primitives.spacing['8'],
              }}
            >
              <Text
                style={{
                  color: theme.semantic.fg['high-emphasis'] as string,
                  fontSize: theme.primitives.font.size['h5'],
                  fontFamily: theme.primitives.font.family.header,
                }}
              >
                Last Game
              </Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center' }}
                onPress={() => router.push('/games')}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    color: theme.semantic.fg['brand-secondary'] as string,
                    fontFamily: theme.primitives.font.family.header,
                    fontSize: theme.primitives.font.size['p-lg'],
                    marginRight: theme.primitives.spacing['4'],
                  }}
                >
                  View All
                </Text>
                <Image
                  source={require('../assets/images/icons/chevron-right.png')}
                  style={{
                    width: 16,
                    height: 16,
                    tintColor: theme.semantic.fg['brand-secondary'] as string,
                  }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            {/* Last game details row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: theme.primitives.radius['8'],
                paddingVertical: theme.primitives.spacing['8'],
                paddingHorizontal: theme.primitives.spacing['8'],
              }}
            >
              {/* Opponent avatar */}
              <Image
                source={require('../assets/images/magnus-pfp.png')}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginRight: theme.primitives.spacing['12'],
                }}
                resizeMode="cover"
              />
              {/* Name and game info */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.semantic.fg.white as string,
                    fontSize: 15,
                    fontFamily: theme.primitives.font.family.header,
                  }}
                  numberOfLines={1}
                >
                  Hikaru Nakamura
                </Text>
                <Text
                  style={{
                    color: theme.semantic.fg['medium-emphasis'] as string,
                    fontSize: 13,
                    fontFamily: theme.primitives.font.family.p,
                  }}
                  numberOfLines={1}
                >
                  World Blitz Final - Round 7
                </Text>
              </View>
              {/* WIN/LOSE badge */}
              <View
                style={{
                  backgroundColor: theme.primitives.color.neutral['90'], // dark background for contrast
                  borderRadius: theme.primitives.radius['6'],
                  paddingVertical: theme.primitives.spacing['4'],
                  paddingHorizontal: theme.primitives.spacing['12'],
                  marginLeft: theme.primitives.spacing['12'],
                }}
              >
                <Text
                  style={{
                    color: theme.primitives.color.brand.primary, // primary color for text
                    fontFamily: theme.primitives.font.family.numeric,
                    fontSize: theme.primitives.font.size.h3,
                    fontWeight: 'bold',
                  }}
                >
                  WIN
                </Text>
              </View>
            </View>
          </View>
          {/* Last event */}
          <View style={{ marginBottom: theme.primitives.spacing['16'] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.primitives.spacing['8'],
              }}
            >
              <Text
                style={{
                  color: theme.semantic.fg['high-emphasis'] as string,
                  fontSize: theme.primitives.font.size['h5'],
                  fontFamily: theme.primitives.font.family.header,
                }}
              >
                Past Event
              </Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center' }}
                onPress={() => router.push('/events')}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    color: theme.semantic.fg['brand-secondary'] as string,
                    fontFamily: theme.primitives.font.family.header,
                    fontSize: theme.primitives.font.size['p-lg'],
                    marginRight: theme.primitives.spacing['4'],
                  }}
                >
                  View All
                </Text>
                <Image
                  source={require('../assets/images/icons/chevron-right.png')}
                  style={{
                    width: 16,
                    height: 16,
                    tintColor: theme.semantic.fg['brand-secondary'] as string,
                  }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            {/* Past event details row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: theme.primitives.radius['8'],
                paddingVertical: theme.primitives.spacing['8'],
                paddingHorizontal: theme.primitives.spacing['8'],
              }}
            >
              {/* Event logo */}
              <Image
                source={require('../assets/images/layer2.png')}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginRight: theme.primitives.spacing['12'],
                }}
                resizeMode="cover"
              />
              {/* Event info */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.semantic.fg.white as string,
                    fontSize: 15,
                    fontFamily: theme.primitives.font.family.header,
                  }}
                  numberOfLines={1}
                >
                  FIDE Grand Prix 2026
                </Text>
                <Text
                  style={{
                    color: theme.semantic.fg['medium-emphasis'] as string,
                    fontSize: 13,
                    fontFamily: theme.primitives.font.family.p,
                  }}
                  numberOfLines={1}
                >
                  Berlin, Germany · May 1, 2026
                </Text>
              </View>
              {/* Finishing position badge */}
              <View
                style={{
                  backgroundColor: theme.primitives.color.neutral['90'],
                  borderRadius: theme.primitives.radius['6'],
                  paddingVertical: theme.primitives.spacing['4'],
                  paddingHorizontal: theme.primitives.spacing['12'],
                  marginLeft: theme.primitives.spacing['12'],
                }}
              >
                <Text
                  style={{
                    color: theme.primitives.color.brand.primary,
                    fontFamily: theme.primitives.font.family.numeric,
                    fontSize: theme.primitives.font.size.h3,
                    fontWeight: 'bold',
                  }}
                >
                  #1ST
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      <VerifyIdentityBottomSheet
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        onSubmit={(photoUri) => {
          setIsVerifyModalOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
