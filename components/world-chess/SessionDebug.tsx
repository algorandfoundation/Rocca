import { type UseSessionResult } from '@/hooks/useSession';
import theme from '@/theme/theme';
import { Text, View } from 'react-native';

interface SessionDebugProps {
  session: UseSessionResult;
}

/**
 * A simple debug component to display session information. This is useful for development and testing purposes to quickly see the current session state, including authentication status and user info.
 */
export default function SessionDebug({ session }: SessionDebugProps) {
  return (
    <View>
      <Text
        style={{
          color: theme.semantic.fg['high-emphasis'] as string,
          fontSize: theme.primitives.font.size['p-md'],
          fontFamily: theme.primitives.font.family.p,
        }}
      >
        Authenticated: {session.data?.authenticated ? 'Yes' : 'No'}
      </Text>

      {session.data?.user && (
        <View>
          <Text
            style={{
              color: theme.semantic.fg['high-emphasis'] as string,
              fontSize: theme.primitives.font.size['p-md'],
              fontFamily: theme.primitives.font.family.p,
            }}
          >
            ID: {session.data.user.id || 'N/A'}
          </Text>
          <Text
            style={{
              color: theme.semantic.fg['high-emphasis'] as string,
              fontSize: theme.primitives.font.size['p-md'],
              fontFamily: theme.primitives.font.family.p,
            }}
          >
            Email: {session.data.user.email || 'N/A'}
          </Text>
          <Text
            style={{
              color: theme.semantic.fg['high-emphasis'] as string,
              fontSize: theme.primitives.font.size['p-md'],
              fontFamily: theme.primitives.font.family.p,
            }}
          >
            Verified: {session.data.user.emailVerified ? 'Yes' : 'No'}
          </Text>
        </View>
      )}

      {session.data?.player && (
        <Text
          style={{
            color: theme.semantic.fg['high-emphasis'] as string,
            fontSize: theme.primitives.font.size['p-md'],
            fontFamily: theme.primitives.font.family.p,
          }}
        >
          Player ID: {session.data.player.id || 'N/A'}
        </Text>
      )}
    </View>
  );
}
