import { PDFDocument, PDFName, decodePDFRawStream } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import type { PDFDict, PDFArray, PDFRef, PDFHexString, PDFString } from 'pdf-lib';
import { ed25519 } from '@noble/curves/ed25519.js';
import { hashDocument } from '@/utils/pdf-sign';
import type { SignatureField } from '@/utils/pdf-sign';
import type { Identity } from '@/extensions/identities/types';

async function readPdfBytes(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

export interface RoccaProof {
  Version: string;
  SignatureType: string;
  Signature: string;
  PublicKey: string;
  SignerDid: string;
  SignerName: string;
  DocumentHash: string;
  Timestamp: string;
  Fields: SignatureField[];
}

export interface OldFormatProof {
  RoccaSignerName: string;
  RoccaPublicKey: string;
  RoccaHash: string;
  RoccaSignature: string;
  RoccaTimestamp: string;
  RoccaSignerDid: string;
}

export type DetectedProof =
  | { type: 'rocca'; proof: RoccaProof }
  | { type: 'old'; proof: OldFormatProof }
  | null;

function stringFromPDF(obj: unknown): string {
  const anyObj = obj as any;
  // PDFHexString has both decodeText (human-readable) and asString (raw hex).
  // Must prefer decodeText so attachment names and metadata match.
  if (typeof anyObj?.decodeText === 'function') return anyObj.decodeText();
  if (typeof anyObj?.asString === 'function') return anyObj.asString();
  return String(obj ?? '');
}

function getInfoDict(pdfDoc: PDFDocument): PDFDict | undefined {
  const infoRef = (pdfDoc.context as any).trailerInfo?.Info;
  if (!infoRef) return undefined;
  const obj = pdfDoc.context.lookup(infoRef);
  return obj && typeof (obj as PDFDict).get === 'function' ? (obj as PDFDict) : undefined;
}

function getCustomTrailer(pdfDoc: PDFDocument): PDFDict | undefined {
  const trailerInfo = (pdfDoc.context as any).trailerInfo as Record<string, any> | undefined;
  if (!trailerInfo) return undefined;
  let custom = trailerInfo.Custom;
  if (custom && typeof (custom as PDFRef).objectNumber === 'number') {
    custom = pdfDoc.context.lookup(custom as PDFRef);
  }
  return custom && typeof (custom as PDFDict).get === 'function' ? (custom as PDFDict) : undefined;
}

export async function extractProof(pdfBytes: Uint8Array): Promise<DetectedProof> {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // 1) New format: Info dict -> RoccaProof
  const infoDict = getInfoDict(pdfDoc);
  const proofString = infoDict ? stringFromPDF(infoDict.get(PDFName.of('RoccaProof'))) : '';
  if (proofString && proofString.startsWith('{')) {
    try {
      const parsed = JSON.parse(proofString) as RoccaProof;
      return { type: 'rocca', proof: parsed };
    } catch {
      // ignore malformed JSON
    }
  }

  // 2) Old format: trailer Custom dict
  const custom = getCustomTrailer(pdfDoc);
  if (!custom) return null;

  const oldName = custom.get(PDFName.of('RoccaSignerName'));
  if (oldName) {
    return {
      type: 'old',
      proof: {
        RoccaSignerName: stringFromPDF(oldName),
        RoccaPublicKey: stringFromPDF(custom.get(PDFName.of('RoccaPublicKey'))),
        RoccaHash: stringFromPDF(custom.get(PDFName.of('RoccaHash'))),
        RoccaSignature: stringFromPDF(custom.get(PDFName.of('RoccaSignature'))),
        RoccaTimestamp: stringFromPDF(custom.get(PDFName.of('RoccaTimestamp'))),
        RoccaSignerDid: stringFromPDF(custom.get(PDFName.of('RoccaSignerDid'))),
      },
    };
  }

  return null;
}

export async function extractOriginalBytes(pdfBytes: Uint8Array): Promise<Uint8Array | null> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const catalog = pdfDoc.catalog;
  const namesObj = catalog.lookup(PDFName.of('Names'));
  if (!namesObj || typeof (namesObj as PDFDict).get !== 'function') return null;
  const names = namesObj as PDFDict;

  const embeddedFilesObj = names.lookup(PDFName.of('EmbeddedFiles'));
  if (!embeddedFilesObj || typeof (embeddedFilesObj as PDFDict).get !== 'function') return null;
  const embeddedFiles = embeddedFilesObj as PDFDict;

  const efNamesObj = embeddedFiles.lookup(PDFName.of('Names'));
  if (!efNamesObj || typeof (efNamesObj as PDFArray).size !== 'function') return null;
  const efNames = efNamesObj as PDFArray;

  for (let i = 0; i < efNames.size(); i += 2) {
    const nameObj = efNames.lookup(i);
    const name = stringFromPDF(nameObj);
    if (name === 'original.pdf') {
      const fileSpecObj = efNames.lookup(i + 1);
      if (!fileSpecObj || typeof (fileSpecObj as PDFDict).get !== 'function') return null;
      const efDict = (fileSpecObj as PDFDict).lookup(PDFName.of('EF')) as PDFDict;
      if (!efDict || typeof efDict.get !== 'function') return null;
      const ref = efDict.get(PDFName.of('F')) as PDFRef;
      if (!ref) return null;
      const stream = pdfDoc.context.lookup(ref);
      if (stream) {
        try {
          const decoded = decodePDFRawStream(stream as any).decode();
          return new Uint8Array(decoded);
        } catch {
          return null;
        }
      }
      return null;
    }
  }
  return null;
}

export interface VerifyResult {
  valid: boolean;
  signerName?: string;
  signerDid?: string;
  timestamp?: string;
  documentHash?: string;
  knownSigner: boolean;
  error?: string;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function verifyPdf(
  sourceUri: string,
  knownIdentities: Identity[],
): Promise<VerifyResult> {
  try {
    const pdfBytes = await readPdfBytes(sourceUri);
    const detected = await extractProof(pdfBytes);
    if (!detected) {
      return { valid: false, knownSigner: false, error: 'No signature found' };
    }
    if (detected.type === 'old') {
      return { valid: false, knownSigner: false, error: 'Signed with older Rocca version' };
    }

    const proof = detected.proof;
    const originalBytes = await extractOriginalBytes(pdfBytes);
    if (!originalBytes) {
      return { valid: false, knownSigner: false, error: 'Cannot extract original document' };
    }

    const hash = hashDocument(
      originalBytes,
      proof.Fields,
      proof.SignerName,
      proof.SignerDid,
      proof.Timestamp,
    );
    const hashHex = Array.from(hash)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    if (hashHex !== proof.DocumentHash) {
      return { valid: false, knownSigner: false, error: 'Document hash mismatch' };
    }

    const signature = hexToBytes(proof.Signature);
    const publicKey = hexToBytes(proof.PublicKey);
    const isValid = ed25519.verify(signature, hash, publicKey);
    if (!isValid) {
      return { valid: false, knownSigner: false, error: 'Signature invalid' };
    }

    const knownSigner = knownIdentities.some(
      (i) => i.did === proof.SignerDid || i.address === proof.SignerDid,
    );

    return {
      valid: true,
      signerName: proof.SignerName,
      signerDid: proof.SignerDid,
      timestamp: proof.Timestamp,
      documentHash: proof.DocumentHash,
      knownSigner,
    };
  } catch (err) {
    return {
      valid: false,
      knownSigner: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
