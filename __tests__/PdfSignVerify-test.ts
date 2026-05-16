import { ed25519 } from '@noble/curves/ed25519.js';
import { hashDocument, stampPdf } from '@/utils/pdf-sign';
import { extractProof, extractOriginalBytes, verifyPdf } from '@/utils/verify-pdf';
import { PDFDocument, PDFName } from 'pdf-lib';
import { base58 } from '@scure/base';
import * as FileSystem from 'expo-file-system/legacy';

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  documentDirectory: 'file:///mock/',
  cacheDirectory: 'file:///mock/cache/',
  EncodingType: {
    Base64: 'base64',
    UTF8: 'utf8',
  },
}));

describe('PDF signing and verification', () => {
  let originalPdfBytes: Uint8Array;
  let originalPdfUri: string;
  let signerName: string;
  let signerDid: string;
  let timestamp: string;
  let fields: import('@/utils/pdf-sign').SignatureField[];
  let secretKey: Uint8Array;
  let publicKey: Uint8Array;
  let publicKeyHex: string;

  beforeAll(async () => {
    // Deterministic secret key for reproducible tests
    secretKey = new Uint8Array(32).fill(0x42);
    publicKey = ed25519.getPublicKey(secretKey);
    publicKeyHex = Array.from(publicKey)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    // Build a real did:key from the public key so getPublicKeyHex resolves it correctly
    const multicodec = new Uint8Array([0xed, 0x01]);
    const combined = new Uint8Array(multicodec.length + publicKey.length);
    combined.set(multicodec);
    combined.set(publicKey, multicodec.length);
    signerDid = 'did:key:z' + base58.encode(combined);

    signerName = 'Alice';
    timestamp = new Date('2024-01-01T00:00:00Z').toISOString();
    fields = [{ id: 'default', page: 1, x: 0, y: 0 }];

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    page.drawText('Test document', { x: 50, y: 700, size: 20 });
    originalPdfBytes = await pdfDoc.save();

    originalPdfUri = 'file:///mock/original.pdf';
    (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(async (uri: string) => {
      if (uri === originalPdfUri) {
        return Buffer.from(originalPdfBytes).toString('base64');
      }
      if (uri.includes('/mock/signed')) {
        return (FileSystem as any).__lastWrittenBase64 || '';
      }
      throw new Error('Unknown URI: ' + uri);
    });

    (FileSystem.writeAsStringAsync as jest.Mock).mockImplementation(
      async (_uri: string, data: string) => {
        (FileSystem as any).__lastWrittenBase64 = data;
        (FileSystem as any).__lastWrittenUri = _uri;
      },
    );

    (FileSystem.documentDirectory as string | null) = 'file:///mock/';
    (FileSystem.cacheDirectory as string | null) = 'file:///mock/cache/';
  });

  beforeEach(() => {
    delete (FileSystem as any).__lastWrittenBase64;
    delete (FileSystem as any).__lastWrittenUri;
  });

  it('signs a PDF and produces a valid RoccaProof', async () => {
    const hash = hashDocument(originalPdfBytes, fields, signerName, signerDid, timestamp);
    const signature = ed25519.sign(hash, secretKey);

    const signedUri = await stampPdf(
      originalPdfUri,
      signerName,
      signerDid,
      hash,
      signature,
      timestamp,
      fields,
    );

    expect(signedUri).toBeTruthy();
    expect((FileSystem as any).__lastWrittenBase64).toBeTruthy();

    const signedBytes = Buffer.from((FileSystem as any).__lastWrittenBase64, 'base64');
    const detected = await extractProof(new Uint8Array(signedBytes));
    expect(detected).not.toBeNull();
    expect(detected!.type).toBe('rocca');
    const proof = detected!.proof as import('@/utils/verify-pdf').RoccaProof;
    expect(proof.Version).toBe('1.0');
    expect(proof.SignatureType).toBe('Ed25519');
    expect(proof.SignerName).toBe(signerName);
    expect(proof.SignerDid).toBe(signerDid);
    expect(proof.DocumentHash).toBe(
      Array.from(hash)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase(),
    );
    expect(proof.PublicKey).toBe(publicKeyHex);

    // Also verify end-to-end
    const vResult = await verifyPdf(signedUri, []);
    expect(vResult.valid).toBe(true);
  });

  it('embeds and extracts the original PDF bytes', async () => {
    const hash = hashDocument(originalPdfBytes, fields, signerName, signerDid, timestamp);
    const signature = ed25519.sign(hash, secretKey);

    await stampPdf(originalPdfUri, signerName, signerDid, hash, signature, timestamp, fields);

    const signedBytes = Buffer.from((FileSystem as any).__lastWrittenBase64, 'base64');
    const extracted = await extractOriginalBytes(new Uint8Array(signedBytes));
    expect(extracted).not.toBeNull();
    expect(new Uint8Array(extracted!).length).toBe(originalPdfBytes.length);
  });

  it('verifies a valid signed PDF and flags the signer as known', async () => {
    const hash = hashDocument(originalPdfBytes, fields, signerName, signerDid, timestamp);
    const signature = ed25519.sign(hash, secretKey);

    await stampPdf(originalPdfUri, signerName, signerDid, hash, signature, timestamp, fields);
    const signedUri = (FileSystem as any).__lastWrittenUri;

    const knownIdentities = [
      {
        address: signerDid,
        did: signerDid,
        type: 'did:key',
        metadata: {},
      } as import('@/extensions/identities/types').Identity,
    ];

    const result = await verifyPdf(signedUri, knownIdentities);
    expect(result.valid).toBe(true);
    expect(result.knownSigner).toBe(true);
    expect(result.signerName).toBe(signerName);
    expect(result.signerDid).toBe(signerDid);
  });

  it('verifies a signed PDF but flags unknown signer', async () => {
    const hash = hashDocument(originalPdfBytes, fields, signerName, signerDid, timestamp);
    const signature = ed25519.sign(hash, secretKey);

    await stampPdf(originalPdfUri, signerName, signerDid, hash, signature, timestamp, fields);
    const signedUri = (FileSystem as any).__lastWrittenUri;

    const result = await verifyPdf(signedUri, []);
    expect(result.valid).toBe(true);
    expect(result.knownSigner).toBe(false);
  });

  it('fails verification if the original attachment is missing', async () => {
    const hash = hashDocument(originalPdfBytes, fields, signerName, signerDid, timestamp);
    const signature = ed25519.sign(hash, secretKey);

    await stampPdf(originalPdfUri, signerName, signerDid, hash, signature, timestamp, fields);
    const signedUri = (FileSystem as any).__lastWrittenUri;

    const result = await verifyPdf(signedUri, []);
    expect(result.valid).toBe(true);

    const tamperedBytes = Buffer.from((FileSystem as any).__lastWrittenBase64, 'base64');
    const tamperedDoc = await PDFDocument.load(new Uint8Array(tamperedBytes));
    tamperedDoc.catalog.delete(PDFName.of('Names'));
    const tampered = Buffer.from(await tamperedDoc.save());

    (FileSystem.readAsStringAsync as jest.Mock).mockImplementationOnce(async () =>
      tampered.toString('base64'),
    );
    const tamperedResult = await verifyPdf(signedUri, []);
    expect(tamperedResult.valid).toBe(false);
    expect(tamperedResult.error).toMatch(/original/i);
  });
});
