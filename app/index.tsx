import { Redirect } from 'expo-router';
import { useProvider } from '@/hooks/useProvider';

export default function Index() {
  const { keys, status } = useProvider();
  if (status === 'loading') return null;
  if (keys.length > 0) return <Redirect href="/landing" />;
  return <Redirect href="/onboarding" />;
}
