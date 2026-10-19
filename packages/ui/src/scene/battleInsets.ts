/** Convert viewport measurements to the renderer's unscaled client pixels. */
export function battleInsets(canvas: { top: number; bottom: number; height: number }, topEdges: readonly number[], footerTop: number, scale = 1) {
  const divisor = scale > 0 ? scale : 1;
  return {
    top: Math.max(0, Math.min(canvas.height, Math.max(canvas.top, ...topEdges) - canvas.top + 10)) / divisor,
    bottom: Math.max(0, Math.min(canvas.height, canvas.bottom - footerTop + 10)) / divisor,
    left: 16,
    right: 16,
  };
}
