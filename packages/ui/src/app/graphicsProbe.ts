/**
 * The quick graphics test behind the automatic quality pick (owner choice
 * 2026-10-03: "Presets + auto"). Runs once, on the first start of this version,
 * when the menu is idle: a short WebGL 2 fill test on a hidden 1280×720
 * canvas (a few passes of a shader with a fixed amount of arithmetic per pixel),
 * timed with a pixel read-back so the GPU has finished. Software renderers are
 * recognised by name and skip the timing. The result is classified by
 * `classifyGraphics` (`@pr/presentation/core`); the thresholds are proposed and
 * were not calibrated on a range of real PCs.
 */
import type { GraphicsProbeResult } from '@pr/presentation/core';

const VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
uniform float u_seed;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy * 0.001 + u_seed;
  float a = 0.0;
  for (int i = 0; i < 96; i++) {
    uv = vec2(sin(uv.y * 1.7 + a), cos(uv.x * 1.3 - a));
    a += uv.x * uv.y * 0.5;
  }
  o = vec4(fract(a), uv * 0.5 + 0.5, 1.0);
}`;

const SOFTWARE = /swiftshader|llvmpipe|softpipe|basic render|software/i;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
}

export function probeGraphics(): GraphicsProbeResult {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }) : null;
  const cores = nav?.hardwareConcurrency ?? 2;
  const memoryGb = typeof nav?.deviceMemory === 'number' ? nav.deviceMemory : null;
  const fail = (renderer = ''): GraphicsProbeResult => ({ webgl2: false, renderer, msPerPass: Infinity, cores, memoryGb });
  let gl: WebGL2RenderingContext | null = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    gl = canvas.getContext('webgl2', { antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) return fail();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String((info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) ?? '');
    if (SOFTWARE.test(renderer)) return { webgl2: true, renderer, msPerPass: Infinity, cores, memoryGb };
    const vs = compile(gl, gl.VERTEX_SHADER, VS);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return { webgl2: true, renderer, msPerPass: Infinity, cores, memoryGb };
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return { webgl2: true, renderer, msPerPass: Infinity, cores, memoryGb };
    gl.useProgram(prog);
    gl.viewport(0, 0, 1280, 720);
    const seed = gl.getUniformLocation(prog, 'u_seed');
    const px = new Uint8Array(4);
    const pass = (k: number) => {
      gl!.uniform1f(seed, k * 0.37);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    };
    // Warm-up (shader upload, first-use costs), then timed samples of three passes each.
    pass(0);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const samples: number[] = [];
    const started = performance.now();
    for (let s = 0; s < 5 && performance.now() - started < 600; s++) {
      const t0 = performance.now();
      for (let k = 1; k <= 3; k++) pass(s * 3 + k);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      samples.push((performance.now() - t0) / 3);
    }
    samples.sort((a, b) => a - b);
    const msPerPass = samples.length ? samples[Math.floor(samples.length / 2)]! : Infinity;
    return { webgl2: true, renderer, msPerPass, cores, memoryGb };
  } catch {
    return fail();
  } finally {
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
