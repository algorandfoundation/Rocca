/**
 * Coordinate mapping between screen pixels (top‑left origin) and
 * PDF page points (bottom‑left origin).
 *
 * Assumes the viewer uses fit‑width mode (fitPolicy=0) and that the
 * rendered page is centred vertically in the container.
 */

export interface PageSize {
  width: number; // PDF points
  height: number; // PDF points
}

/**
 * Convert a screen touch coordinate to a PDF page coordinate.
 *
 * @param touchX    Screen X in points (top‑left origin)
 * @param touchY    Screen Y in points (top‑left origin)
 * @param cx        Container width  (screen points)
 * @param cy        Container height (screen points)
 * @param pageW     Page width  (PDF points)
 * @param pageH     Page height (PDF points)
 * @param zoom      Current zoom scale (1.0 = fit‑width)
 */
export function screenToPdf(
  touchX: number,
  touchY: number,
  cx: number,
  cy: number,
  pageW: number,
  pageH: number,
  zoom: number,
): { x: number; y: number } {
  const renderedW = cx * zoom;
  const renderedH = (pageH / pageW) * renderedW;

  const offsetX = (cx - renderedW) / 2;
  const offsetY = (cy - renderedH) / 2;

  const pdfX = ((touchX - offsetX) / renderedW) * pageW;
  const pdfY = ((renderedH - (touchY - offsetY)) / renderedH) * pageH;

  return {
    x: Math.max(0, Math.min(pageW, pdfX)),
    y: Math.max(0, Math.min(pageH, pdfY)),
  };
}

/**
 * Convert a stored PDF page coordinate back to screen pixels
 * for rendering a marker on top of the PDF viewer.
 */
export function pdfToScreen(
  pdfX: number,
  pdfY: number,
  cx: number,
  cy: number,
  pageW: number,
  pageH: number,
  zoom: number,
): { x: number; y: number } {
  const renderedW = cx * zoom;
  const renderedH = (pageH / pageW) * renderedW;

  const offsetX = (cx - renderedW) / 2;
  const offsetY = (cy - renderedH) / 2;

  const screenX = offsetX + (pdfX / pageW) * renderedW;
  const screenY = offsetY + ((pageH - pdfY) / pageH) * renderedH;

  return { x: screenX, y: screenY };
}
