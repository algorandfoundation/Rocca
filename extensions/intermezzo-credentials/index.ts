import { WithIntermezzoCredentials } from './extension';

export * from './extension';

// Re-export the shared transport types/client so existing consumers
// importing them from this package keep working after the split into
// `lib/intermezzo`. New code should import directly from
// `@/lib/intermezzo`.
export {
  IntermezzoClient,
  IntermezzoHttpError,
  IntermezzoCredentialsClient,
} from '@/lib/intermezzo';
export type {
  CreateCredentialOfferRequest,
  CreatePresentationRequestRequest,
  CredentialOfferResponse,
  IntermezzoClientConfig,
  IntermezzoCredentialsClientConfig,
  PresentationRequestResponse,
  RemoteIssuanceSession,
  RemoteVerificationSession,
  SetCredentialConfigurationRequest,
} from '@/lib/intermezzo';

export default WithIntermezzoCredentials;
