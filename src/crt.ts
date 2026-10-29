// WebGL post pass. The game draws to a 2D source canvas, this module puts it
// on the visible canvas through a phosphor persistence buffer and a CRT tube:
// curvature, bloom, aperture grille, scanlines, chroma split, roll and glitch.

export interface CrtParams {
  time: number
  dt: number
  surge: number
  glitch: number
  flash: number
  motion: number
}

export interface Crt {
  canvas: HTMLCanvasElement
  draw(source: HTMLCanvasElement, params: CrtParams): void
}

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const PERSIST = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_src;
uniform sampler2D u_prev;
uniform float u_decay;
void main() {
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
  vec3 now = texture2D(u_src, uv).rgb;
  vec3 old = texture2D(u_prev, v_uv).rgb * u_decay;
  gl_FragColor = vec4(max(now, old), 1.0);
}
`

const TUBE = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_img;
uniform vec2 u_res;
uniform vec2 u_src;
uniform float u_time;
uniform float u_surge;
uniform float u_glitch;
uniform float u_flash;
uniform float u_motion;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 curve(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  vec2 off = c.yx * c.yx * vec2(0.045, 0.06);
  c += c * off;
  return c * 0.5 + 0.5;
}

vec3 tap(vec2 uv) {
  return texture2D(u_img, uv).rgb;
}

void main() {
  vec2 uv = curve(v_uv);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float band = floor(uv.y * 48.0);
  float tear = step(0.82, hash(vec2(band, floor(u_time * 24.0)))) * u_glitch;
  uv.x += (hash(vec2(band, u_time)) - 0.5) * 0.06 * tear;
  uv.x += sin(uv.y * 900.0 + u_time * 40.0) * 0.0007 * u_glitch;

  vec2 px = 1.0 / u_src;
  float split = (0.9 + u_surge * 1.6 + u_glitch * 5.0) * px.x;
  vec3 col;
  col.r = tap(uv + vec2(split, 0.0)).r;
  col.g = tap(uv).g;
  col.b = tap(uv - vec2(split, 0.0)).b;

  vec3 glow = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7854 + 0.39;
    vec2 dir = vec2(cos(a), sin(a));
    glow += tap(uv + dir * px * 4.0) * 0.6;
    glow += tap(uv + dir * px * 9.0) * 0.5;
    glow += tap(uv + dir * px * 16.0) * 0.35;
    total += 1.45;
  }
  glow /= total;
  glow = max(glow - 0.06, 0.0);
  col += glow * (0.85 + u_surge * 0.2);

  float lines = u_src.y * 0.5;
  float scan = 0.5 + 0.5 * sin(uv.y * lines * 6.28318);
  col *= mix(1.0, 0.62 + 0.38 * scan, 0.85);

  float tri = mod(floor(gl_FragCoord.x), 3.0);
  vec3 mask = vec3(tri == 0.0 ? 1.0 : 0.72, tri == 1.0 ? 1.0 : 0.72, tri == 2.0 ? 1.0 : 0.72);
  col *= mix(vec3(1.0), mask * 1.18, 0.55);

  float roll = 1.0 - fract(u_time * 0.08);
  float rollBand = smoothstep(0.0, 0.06, 0.06 - abs(uv.y - roll)) * u_motion;
  col += vec3(0.02, 0.05, 0.05) * rollBand;

  col += (hash(uv * u_res + u_time * 61.0) - 0.5) * (0.045 + u_glitch * 0.12);
  col *= 1.0 - 0.025 * u_motion * sin(u_time * 120.0);
  col += vec3(0.85, 1.0, 0.95) * u_flash * 0.16;

  vec2 v = uv * (1.0 - uv);
  float vig = pow(v.x * v.y * 18.0, 0.28);
  col *= clamp(vig, 0.0, 1.0);

  vec2 edge = smoothstep(vec2(0.0), vec2(0.004), uv) * smoothstep(vec2(0.0), vec2(0.004), 1.0 - uv);
  col *= edge.x * edge.y;

  gl_FragColor = vec4(col, 1.0);
}
`

interface Target {
  tex: WebGLTexture
  fbo: WebGLFramebuffer
  w: number
  h: number
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(shader))
    return null
  }
  return shader
}

function program(gl: WebGLRenderingContext, frag: string): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag)
  const prog = gl.createProgram()
  if (!vs || !fs || !prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.bindAttribLocation(prog, 0, 'a_pos')
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(prog))
    return null
  }
  return prog
}

function texture(gl: WebGLRenderingContext): WebGLTexture {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

function target(gl: WebGLRenderingContext, w: number, h: number): Target {
  const tex = texture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  const fbo = gl.createFramebuffer()!
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.clearColor(0, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return { tex, fbo, w, h }
}

function drop(gl: WebGLRenderingContext, t: Target | null): void {
  if (!t) return
  gl.deleteTexture(t.tex)
  gl.deleteFramebuffer(t.fbo)
}

export function createCrt(): Crt | null {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false })
  if (!gl) return null
  const persist = program(gl, PERSIST)
  const tube = program(gl, TUBE)
  if (!persist || !tube) return null

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const srcTex = texture(gl)
  let read: Target | null = null
  let write: Target | null = null

  const u = (prog: WebGLProgram, name: string) => gl.getUniformLocation(prog, name)
  const P = {
    src: u(persist, 'u_src'),
    prev: u(persist, 'u_prev'),
    decay: u(persist, 'u_decay'),
  }
  const T = {
    img: u(tube, 'u_img'),
    res: u(tube, 'u_res'),
    src: u(tube, 'u_src'),
    time: u(tube, 'u_time'),
    surge: u(tube, 'u_surge'),
    glitch: u(tube, 'u_glitch'),
    flash: u(tube, 'u_flash'),
    motion: u(tube, 'u_motion'),
  }

  return {
    canvas,
    draw(source, params) {
      if (gl.isContextLost()) return
      const w = source.width
      const h = source.height
      if (!w || !h) return
      if (!read || read.w !== w || read.h !== h) {
        drop(gl, read)
        drop(gl, write)
        read = target(gl, w, h)
        write = target(gl, w, h)
      }

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, srcTex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)

      gl.useProgram(persist)
      gl.bindFramebuffer(gl.FRAMEBUFFER, write!.fbo)
      gl.viewport(0, 0, w, h)
      gl.uniform1i(P.src, 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, read.tex)
      gl.uniform1i(P.prev, 1)
      const decay = params.motion > 0 ? Math.pow(0.62, params.dt * 60) : 0
      gl.uniform1f(P.decay, decay)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      gl.useProgram(tube)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, write!.tex)
      gl.uniform1i(T.img, 0)
      gl.uniform2f(T.res, canvas.width, canvas.height)
      gl.uniform2f(T.src, w, h)
      gl.uniform1f(T.time, params.time)
      gl.uniform1f(T.surge, params.surge)
      gl.uniform1f(T.glitch, params.glitch * params.motion)
      gl.uniform1f(T.flash, params.flash)
      gl.uniform1f(T.motion, params.motion)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      const swap = read
      read = write
      write = swap
    },
  }
}
