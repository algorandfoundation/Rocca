import { PDFDocument, PDFName, PDFString, rgb, StandardFonts } from 'pdf-lib';
import type { PDFPage, PDFFont } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';
import { getPublicKeyHex } from '@/utils/did-public-key';

export interface SignatureField {
  id: string;
  page: number;
  x: number;
  y: number;
  type?: 'signature' | 'field';
  content?: string;
  size?: number;
}

async function readPdfBytes(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

async function writePdfBytes(bytes: Uint8Array, prefix: string): Promise<string> {
  const filename = `${prefix}-${Date.now()}.pdf`;
  const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  const uri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, Buffer.from(bytes).toString('base64'), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

function shortHex(hex: string, chars = 12): string {
  if (hex.length <= chars * 2) return hex;
  return `${hex.slice(0, chars)}…${hex.slice(-chars)}`;
}

function widthAt(text: string, size: number, font: any): number {
  return font.widthOfTextAtSize(text, size);
}

/* ------------------------------------------------------------------ */
/*  Signature stamp — clean: name + underline + short key + short sig  */
/* ------------------------------------------------------------------ */

function drawSignatureStamp(
  page: PDFPage,
  field: SignatureField,
  signerName: string,
  timestamp: string,
  publicKeyHex: string,
  signature: Uint8Array,
  _font: PDFFont,
  cursiveFont: PDFFont,
) {
  const hasCustomPosition = field.x !== 0 || field.y !== 0;
  const x = hasCustomPosition ? field.x : 40;
  const y = hasCustomPosition ? field.y : 40;

  const nameSize = field.size ?? 22;
  const metaSize = Math.max(7, nameSize * 0.42);
  const footerSize = Math.max(6, nameSize * 0.32);

  const shortKey = shortHex(publicKeyHex, 8);
  const shortSig = shortHex(Buffer.from(signature).toString('hex').toUpperCase(), 8);

  const nameWidth = cursiveFont.widthOfTextAtSize(signerName, nameSize);

  // Underline
  page.drawLine({
    start: { x: x - 4, y: y + nameSize + 3 },
    end: { x: x + nameWidth + 4, y: y + nameSize + 3 },
    thickness: Math.max(0.8, nameSize * 0.055),
    color: rgb(0, 0.4, 0.8),
  });

  // Name in cursive (Times Italic)
  page.drawText(signerName, {
    x,
    y: y + 2,
    size: nameSize,
    font: cursiveFont,
    color: rgb(0, 0.2, 0.6),
  });

  // Short key + short sig
  const meta = `Key: ${shortKey}  |  Sig: ${shortSig}`;
  page.drawText(meta, {
    x,
    y: y - nameSize * 0.45,
    size: metaSize,
    font: _font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Timestamp
  page.drawText(`Rocca \u00B7 ${new Date(timestamp).toLocaleString()}`, {
    x,
    y: y - nameSize * 0.82,
    size: footerSize,
    font: _font,
    color: rgb(0.6, 0.6, 0.6),
  });
}

/* ------------------------------------------------------------------ */
/*  Text field — shows exactly what the user typed                     */
/* ------------------------------------------------------------------ */

function drawTextField(page: PDFPage, field: SignatureField, _signerName: string, font: PDFFont) {
  const { x, y } = field;
  const text = field.content || '(empty)';
  const textSize = field.size ?? 14;

  const textWidth = widthAt(text, textSize, font);

  // Subtle background
  page.drawRectangle({
    x: x - 4,
    y: y - 2,
    width: textWidth + 8,
    height: 18,
    color: rgb(0.95, 0.97, 1.0),
    borderColor: rgb(0.8, 0.85, 0.95),
    borderWidth: 0.5,
  });

  page.drawText(text, {
    x,
    y: y + 2,
    size: textSize,
    font,
    color: rgb(0.1, 0.1, 0.15),
  });
}

/* ------------------------------------------------------------------ */
/*  stampPdf                                                           */
/* ------------------------------------------------------------------ */

export async function stampPdf(
  sourceUri: string,
  signerName: string,
  signerDid: string,
  hashPayload: Uint8Array,
  signature: Uint8Array,
  timestamp: string,
  fields: SignatureField[],
): Promise<string> {
  const pdfBytes = await readPdfBytes(sourceUri);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const cursiveFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const rawPublicKeyHex = getPublicKeyHex(signerDid) || 'N/A';

  // Stamp each field on its designated page
  for (const field of fields) {
    const page = pages[field.page - 1];
    if (!page) continue;
    const type = field.type || 'signature';
    if (type === 'field') {
      drawTextField(page, field, signerName, font);
    } else {
      drawSignatureStamp(
        page,
        field,
        signerName,
        timestamp,
        rawPublicKeyHex,
        signature,
        font,
        cursiveFont,
      );
    }
  }

  // --- embed original PDF as attachment ---
  await pdfDoc.attach(pdfBytes, 'original.pdf', {
    mimeType: 'application/pdf',
    description: 'The original document before signing',
  });

  // --- embed metadata into Info dict (guaranteed to survive save) ---
  const proofObj = {
    Version: '1.0',
    SignatureType: 'Ed25519',
    Signature: Buffer.from(signature).toString('hex').toUpperCase(),
    PublicKey: rawPublicKeyHex,
    SignerDid: signerDid,
    SignerName: signerName,
    DocumentHash: Buffer.from(hashPayload).toString('hex').toUpperCase(),
    Timestamp: timestamp,
    Fields: fields,
  };

  const infoDict = (pdfDoc as any).getInfoDict();
  if (infoDict && typeof infoDict.set === 'function') {
    infoDict.set(PDFName.of('RoccaProof'), PDFString.of(JSON.stringify(proofObj)));
  }

  // --- keep backward-compatible flat keys for old-format detection ---
  const dict = pdfDoc.context.obj({
    RoccaSignerName: signerName,
    RoccaPublicKey: rawPublicKeyHex,
    RoccaHash: Buffer.from(hashPayload).toString('hex').toUpperCase(),
    RoccaSignature: Buffer.from(signature).toString('hex').toUpperCase(),
    RoccaTimestamp: timestamp,
    RoccaSignerDid: signerDid,
  });
  (pdfDoc.context.trailerInfo as any).Custom = pdfDoc.context.register(dict);

  const signedBytes = await pdfDoc.save();
  const outUri = await writePdfBytes(signedBytes, 'signed');
  console.log(
    '[pdf-sign] stampPdf fields:',
    outUri,
    '| pages:',
    pages.length,
    '| fields:',
    fields.length,
    '| pubkey:',
    rawPublicKeyHex.slice(0, 16) + '...',
    '| hash:',
    hashPayload.slice(0, 8) + '...',
    '| sig:',
    signature.slice(0, 8) + '...',
  );
  return outUri;
}

export function hashDocument(
  originalPdfBytes: Uint8Array,
  fields: SignatureField[],
  signerName: string,
  signerDid: string,
  timestamp: string,
): Uint8Array {
  const encoder = new TextEncoder();
  const parts = [
    originalPdfBytes,
    encoder.encode(JSON.stringify(fields)),
    encoder.encode(signerName),
    encoder.encode(signerDid),
    encoder.encode(timestamp),
  ];

  let totalLength = 0;
  for (const p of parts) totalLength += p.length;

  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const p of parts) {
    combined.set(p, offset);
    offset += p.length;
  }

  return sha256(combined);
}
