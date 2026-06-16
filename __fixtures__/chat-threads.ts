import { ChatThread } from '@/components/ChatRow';

export const mockChatThreads: ChatThread[] = [
  {
    id: '1',
    name: 'Finance Agent',
    preview: 'Your transaction has been verified successfully.',
    timestamp: '2m ago',
    avatarColor: '#1a73e8',
    avatarBg: '#e3f2fd',
  },
  {
    id: '2',
    name: 'GitHub Agent',
    preview: 'Please sign the commit with your passkey to proceed.',
    timestamp: '14m ago',
    avatarColor: '#34a853',
    avatarBg: '#e6f4ea',
  },
  {
    id: '3',
    name: 'Lofty AI',
    preview: 'Welcome back! Your portfolio update is ready.',
    timestamp: '1h ago',
    avatarColor: '#ea4335',
    avatarBg: '#fce8e6',
  },
];
