import { PDFDocument, PDFName } from 'pdf-lib';

describe('pdf-lib attach roundtrip', () => {
  it('attaches and extracts bytes', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    const original = Buffer.from('hello attachment world');

    await doc.attach(original, 'original.pdf', {
      mimeType: 'application/pdf',
      description: 'original',
    });

    const bytes = await doc.save();
    console.log('Saved PDF size:', bytes.length);

    // Check for /Names in raw bytes
    const raw = Buffer.from(bytes).toString();
    console.log('Has /Names:', raw.includes('/Names'));
    console.log('Has /EmbeddedFiles:', raw.includes('/EmbeddedFiles'));
    console.log('Has original.pdf:', raw.includes('original.pdf'));

    const parsed = await PDFDocument.load(bytes);
    const catalog = parsed.catalog;
    console.log('Catalog has Names:', catalog.lookup(PDFName.of('Names')) != null);

    const names = catalog.lookup(PDFName.of('Names')) as any;
    if (names) {
      const ef = names.lookup(PDFName.of('EmbeddedFiles'));
      console.log('EmbeddedFiles type:', ef?.constructor?.name);
      if (ef) {
        const efNames = ef.lookup(PDFName.of('Names'));
        console.log('EFNames type:', efNames?.constructor?.name, 'size:', efNames?.size?.());
        if (efNames) {
          for (let i = 0; i < efNames.size(); i += 2) {
            const nObj = efNames.lookup(i);
            const name = typeof nObj?.decodeText === 'function' ? nObj.decodeText() : String(nObj);
            console.log('  Attachment name:', name);
            if (name === 'original.pdf') {
              const fsObj = efNames.lookup(i + 1);
              console.log('  FileSpec type:', fsObj?.constructor?.name);
              if (fsObj && typeof fsObj.get === 'function') {
                const efDict = fsObj.get(PDFName.of('EF'));
                console.log('  EF dict type:', efDict?.constructor?.name);
                if (efDict && typeof efDict.get === 'function') {
                  const ref = efDict.get(PDFName.of('F'));
                  console.log(
                    '  Stream ref type:',
                    ref?.constructor?.name,
                    'num:',
                    ref?.objectNumber,
                  );
                  const stream = parsed.context.lookup(ref);
                  console.log('  Stream type:', stream?.constructor?.name);
                  if (stream && typeof stream.getContents === 'function') {
                    const contents = stream.getContents();
                    console.log('  Contents length:', contents.length);
                    console.log(
                      '  Contents match:',
                      Buffer.from(contents).toString() === original.toString(),
                    );
                  }
                }
              }
            }
          }
        }
      }
    }

    // Also verify via our helper
    const { extractOriginalBytes } = require('@/utils/verify-pdf');
    const extracted = await extractOriginalBytes(new Uint8Array(bytes));
    console.log('extractOriginalBytes result null?', extracted == null);
    if (extracted) {
      console.log('extracted length:', extracted.length);
    }
  });
});
