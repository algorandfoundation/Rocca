import { WithIntermezzoIdentities } from './extension';

export * from './extension';
export {
  createIdentityAlgorandSigner,
  signGroupForIdentity,
  type AddressWithSigners,
  type TransactionSigner,
} from './algorandSigner';

// Re-export the shared transport types/client so existing consumers
// importing them from this package keep working. New code should
// import directly from `@/lib/intermezzo`.
export { IntermezzoClient, IntermezzoHttpError } from '@/lib/intermezzo';
export type {
  BuildUserContractCreateRequest,
  BuildUserContractCreateResponse,
  BuildUserDidDocumentUpdateRequest,
  BuildUserDidDocumentUpdateResponse,
  CredentialPresentationOptions,
  IntermezzoClientConfig,
  ManagerIdentityResponse,
  SignedUserDidUpdateGroup,
  SubmitUserContractCreateRequest,
  SubmitUserContractCreateResponse,
  SubmitUserDidDocumentUpdateRequest,
  SubmitUserDidDocumentUpdateResponse,
  UnsignedAlgorandGroup,
} from '@/lib/intermezzo';

export default WithIntermezzoIdentities;
