import { screenToPdf, pdfToScreen } from '@/utils/pdf-form';

describe('PDF coordinate mapping', () => {
  const containerW = 400;
  const containerH = 600;
  const pageW = 612;
  const pageH = 792;

  it('roundtrips a corner point at zoom=1', () => {
    // Bottom-left of the page (in PDF coords)
    const pdfX = 0;
    const pdfY = 0;
    const { x: sx, y: sy } = pdfToScreen(pdfX, pdfY, containerW, containerH, pageW, pageH, 1);
    const back = screenToPdf(sx, sy, containerW, containerH, pageW, pageH, 1);
    expect(back.x).toBeCloseTo(pdfX, 1);
    expect(back.y).toBeCloseTo(pdfY, 1);
  });

  it('roundtrips a centre point at zoom=1', () => {
    const pdfX = pageW / 2;
    const pdfY = pageH / 2;
    const { x: sx, y: sy } = pdfToScreen(pdfX, pdfY, containerW, containerH, pageW, pageH, 1);
    const back = screenToPdf(sx, sy, containerW, containerH, pageW, pageH, 1);
    expect(back.x).toBeCloseTo(pdfX, 1);
    expect(back.y).toBeCloseTo(pdfY, 1);
  });

  it('roundtrips a point at zoom=1.5', () => {
    const pdfX = 200;
    const pdfY = 300;
    const { x: sx, y: sy } = pdfToScreen(pdfX, pdfY, containerW, containerH, pageW, pageH, 1.5);
    const back = screenToPdf(sx, sy, containerW, containerH, pageW, pageH, 1.5);
    expect(back.x).toBeCloseTo(pdfX, 1);
    expect(back.y).toBeCloseTo(pdfY, 1);
  });

  it('maps screen top-left to PDF bottom-left at zoom=1', () => {
    // When the page is centered vertically there is an offset.  Find
    // the actual screen corner that corresponds to PDF (0,0).
    const { x, y } = screenToPdf(0, containerH, containerW, containerH, pageW, pageH, 1);
    // Because the page is fit-to-width, the rendered height is
    //   (pageH/pageW) * containerW  ≈  516
    // so vertical offset = (600 - 516) / 2 ≈ 42.
    // The bottom of the rendered page is roughly at screen Y = 600 - 42 = 558.
    // A tap there should map back to close to PDF (0,0).
    expect(x).toBeLessThan(5);
    expect(y).toBeLessThan(5);
  });

  it('clamps out-of-bounds PDF coordinates', () => {
    // Tap far below the page → clamps to bottom (PDF y = 0)
    const { x, y } = screenToPdf(-100, containerH + 100, containerW, containerH, pageW, pageH, 1);
    expect(x).toBe(0);
    expect(y).toBe(0);
  });
});
