import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';
import { getPublicKeyHex, toGpgFormat } from '@/utils/did-public-key';

export interface SignatureField {
  id: string;
  page: number;
  x: number;
  y: number;
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

/**
 * Placeholder for future visual preview markers. Currently a no-op.
 */
export async function markPdf(_sourceUri: string, _fields: SignatureField[]): Promise<string> {
  return '';
}

function widthAt(text: string, size: number, font: any): number {
  return font.widthOfTextAtSize(text, size);
}

/**
 * Stamp the PDF with the signer name + labelled public key / hash / signature
 * at the bottom-right of the LAST page only.
 * Also embeds all values as custom document metadata.
 */
export async function stampPdf(
  sourceUri: string,
  signerName: string,
  signerDid: string,
  hashPayload: Uint8Array,
  signature: Uint8Array,
  timestamp: string,
): Promise<string> {
  const pdfBytes = await readPdfBytes(sourceUri);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const rawPublicKeyHex = getPublicKeyHex(signerDid) || 'N/A';
  const publicKeyGpg = toGpgFormat(rawPublicKeyHex);
  const hashGpg = toGpgFormat(Buffer.from(hashPayload).toString('hex').toUpperCase());
  const sigGpg = toGpgFormat(Buffer.from(signature).toString('hex').toUpperCase());

  // --- stamp THE LAST PAGE only ---
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();

  const nameSize = 16;
  const infoSize = 7;
  const footerSize = 5;
  const rightMargin = 60;
  const bottomMargin = 60;
  const labelGap = 2; // space between label and value

  const labels = ['Public Key:', 'Hash:', 'Signature:'];
  const values = [publicKeyGpg, hashGpg, sigGpg];

  const labelWidth = Math.max(...labels.map((l) => widthAt(l, infoSize, font)));

  const lineWidth = (i: number) => labelWidth + labelGap + widthAt(values[i], infoSize, font);

  const nameWidth = widthAt(signerName, nameSize, font);
  const maxTextWidth = Math.max(nameWidth, ...values.map((_, i) => lineWidth(i)));

  const x = Math.max(40, width - maxTextWidth - rightMargin);
  const y = bottomMargin;

  // Signature underline
  lastPage.drawLine({
    start: { x: x - 6, y: y + nameSize + 4 },
    end: { x: x + nameWidth + 6, y: y + nameSize + 4 },
    thickness: 1.2,
    color: rgb(0, 0.4, 0.8),
  });

  // Typed name
  lastPage.drawText(signerName, {
    x,
    y: y + 2,
    size: nameSize,
    font,
    color: rgb(0, 0.4, 0.8),
  });

  // Public Key / Hash / Signature — label + value aligned
  let lineY = y - 9;
  for (let i = 0; i < labels.length; i++) {
    lastPage.drawText(labels[i], {
      x,
      y: lineY,
      size: infoSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    lastPage.drawText(values[i], {
      x: x + labelWidth + labelGap,
      y: lineY,
      size: infoSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    lineY -= 8;
  }

  // Timestamp
  lastPage.drawText(`Signed via Rocca \u00B7 ${new Date(timestamp).toLocaleString()}`, {
    x,
    y: lineY - 1,
    size: footerSize,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  // --- embed metadata ---
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
    '[pdf-sign] stampPdf last page:',
    outUri,
    '| pages:',
    pages.length,
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
