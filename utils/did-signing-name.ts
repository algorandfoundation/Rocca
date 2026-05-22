import type { DIDDocument, Service } from '@/extensions/identities/types';

const SIGNING_NAME_SERVICE_TYPE = 'SigningNameService';

/**
 * Extract the user's preferred signing name from a DID Document's
 * SigningNameService entry, if one exists.
 */
export function getSigningName(doc: DIDDocument | undefined): string | undefined {
  if (!doc) return undefined;
  const service = doc.service.find((s) => s.type === SIGNING_NAME_SERVICE_TYPE);
  return service?.name as string | undefined;
}

/**
 * Return a new DID Document with the SigningNameService updated (or added).
 */
export function setSigningName(doc: DIDDocument, name: string): DIDDocument {
  const existingIndex = doc.service.findIndex((s) => s.type === SIGNING_NAME_SERVICE_TYPE);

  const newService: Service = {
    id: `${doc.id}#signing-name`,
    type: SIGNING_NAME_SERVICE_TYPE,
    name,
  };

  const newServiceList =
    existingIndex >= 0
      ? doc.service.map((s, i) => (i === existingIndex ? newService : s))
      : [...doc.service, newService];

  return { ...doc, service: newServiceList };
}
