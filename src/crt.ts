// WebGL tube. The whole screen is drawn to a 2D source canvas, then this puts
// it on the visible canvas: phosphor persistence, a wide two-pass bloom, then a
// curved tube with dot-matrix pixels, beam smear, soft focus, chroma split,
// glitch tearing and a power-on squeeze.

export interface CrtParams {
  time: number
  dt: number
  surge: number
  glitch: number
  flash: number
  power: number
  motion: number
  cell: number
}

export interface Crt {
  canvas: HTMLCanvasElement
  draw(source: HTMLCanvasElement, params: CrtParams): void
}

export const CURVE = { x: 0.035, y: 0.05 }

// Same mapping the tube shader uses: screen uv in, source uv out.
export function curve(u: number, v: number): { u: number; v: number } {
  const cx = u * 2 - 1
  const cy = v * 2 - 1
  const x = cx + cx * cy * cy * CURVE.x
  const y = cy + cy * cx * cx * CURVE.y
  return { u: x * 0.5 + 0.5, v: y * 0.5 + 0.5 }
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
  vec3 now = texture2D(u_src, vec2(v_uv.x, 1.0 - v_uv.y)).rgb;
  vec3 old = texture2D(u_prev, v_uv).rgb * u_decay;
  gl_FragColor = vec4(max(now, old), 1.0);
}
`

const DOWN = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_img;
uniform vec2 u_px;
void main() {
  vec3 c = texture2D(u_img, v_uv + u_px * vec2(-1.0, -1.0)).rgb;
  c += texture2D(u_img, v_uv + u_px * vec2(1.0, -1.0)).rgb;
  c += texture2D(u_img, v_uv + u_px * vec2(-1.0, 1.0)).rgb;
  c += texture2D(u_img, v_uv + u_px * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  c = max(c - 0.1, 0.0) * 1.25;
  gl_FragColor = vec4(c, 1.0);
}
`

const BLUR = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_img;
uniform vec2 u_dir;
void main() {
  vec3 c = texture2D(u_img, v_uv).rgb * 0.227;
  c += texture2D(u_img, v_uv + u_dir * 1.385).rgb * 0.316;
  c += texture2D(u_img, v_uv - u_dir * 1.385).rgb * 0.316;
  c += texture2D(u_img, v_uv + u_dir * 3.231).rgb * 0.070;
  c += texture2D(u_img, v_uv - u_dir * 3.231).rgb * 0.070;
  gl_FragColor = vec4(c, 1.0);
}
`

const TUBE = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_img;
uniform sampler2D u_bloom;
uniform vec2 u_src;
uniform float u_time;
uniform float u_surge;
uniform float u_glitch;
uniform float u_flash;
uniform float u_power;
uniform float u_motion;
uniform float u_cell;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 curve(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  c += c * (c.yx * c.yx) * vec2(${CURVE.x.toFixed(4)}, ${CURVE.y.toFixed(4)});
  return c * 0.5 + 0.5;
}

vec3 tap(vec2 uv) {
  return texture2D(u_img, uv).rgb;
}

void main() {
  vec2 uv = curve(v_uv);

  float squeeze = clamp(u_power * 2.2 - 0.9, 0.004, 1.0);
  float widen = clamp(u_power * 3.0, 0.02, 1.0);
  uv.y = 0.5 + (uv.y - 0.5) / squeeze;
  uv.x = 0.5 + (uv.x - 0.5) / widen;

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float band = floor(uv.y * 64.0);
  float tear = step(0.84, hash(vec2(band, floor(u_time * 20.0)))) * u_glitch;
  uv.x += (hash(vec2(band, u_time)) - 0.5) * 0.05 * tear;
  uv.x += sin(uv.y * 700.0 + u_time * 30.0) * 0.0006 * (u_glitch + 0.25 * u_motion);

  vec2 px = 1.0 / u_src;
  float split = (1.2 + u_surge * 1.4 + u_glitch * 6.0) * px.x;
  vec3 sharp;
  sharp.r = tap(uv + vec2(split, 0.0)).r;
  sharp.g = tap(uv).g;
  sharp.b = tap(uv - vec2(split, 0.4 * px.y)).b;

  vec3 soft = tap(uv + px * vec2(1.5, 0.0)) + tap(uv - px * vec2(1.5, 0.0))
            + tap(uv + px * vec2(0.0, 1.5)) + tap(uv - px * vec2(0.0, 1.5));
  vec3 base = mix(sharp, soft * 0.25, 0.4);

  vec3 smear = tap(uv - px * vec2(2.0, 0.0)) * 0.5
             + tap(uv - px * vec2(5.0, 0.0)) * 0.3
             + tap(uv - px * vec2(9.0, 0.0)) * 0.18;
  base += smear * 0.28;

  vec3 glow = texture2D(u_bloom, uv).rgb;

  vec2 cell = gl_FragCoord.xy / u_cell;
  vec2 f = fract(cell + vec2(mod(floor(cell.y), 2.0) * 0.5, 0.0)) - 0.5;
  float dotMask = smoothstep(0.52, 0.18, length(f));
  float mask = mix(0.32, 1.45, dotMask);

  vec3 col = base * mask + glow * (1.35 + u_surge * 0.5) * (0.55 + 0.45 * dotMask);

  float roll = 1.0 - fract(u_time * 0.07);
  col += vec3(0.02, 0.04, 0.07) * smoothstep(0.08, 0.0, abs(uv.y - roll)) * u_motion;

  col += vec3(0.002, 0.006, 0.016);
  col += (hash(uv * u_src + u_time * 61.0) - 0.5) * (0.05 + u_glitch * 0.14);
  col *= 1.0 - 0.03 * u_motion * sin(u_time * 110.0);
  col += vec3(0.8, 0.92, 1.0) * u_flash * 0.12;
  col *= 1.0 + (1.0 - u_power) * 3.0;

  vec2 v = uv * (1.0 - uv);
  col *= clamp(pow(v.x * v.y * 22.0, 0.32), 0.0, 1.0);
  vec2 edge = smoothstep(vec2(0.0), vec2(0.006), uv) * smoothstep(vec2(0.0), vec2(0.006), 1.0 - uv);
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
  const context = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false })
  if (!context) return null
  const gl: WebGLRenderingContext = context
  const persist = program(gl, PERSIST)
  const down = program(gl, DOWN)
  const blur = program(gl, BLUR)
  const tube = program(gl, TUBE)
  if (!persist || !down || !blur || !tube) return null

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const srcTex = texture(gl)
  let read: Target | null = null
  let write: Target | null = null
  let bloomA: Target | null = null
  let bloomB: Target | null = null

  const u = (prog: WebGLProgram, name: string) => gl.getUniformLocation(prog, name)
  const P = { src: u(persist, 'u_src'), prev: u(persist, 'u_prev'), decay: u(persist, 'u_decay') }
  const D = { img: u(down, 'u_img'), px: u(down, 'u_px') }
  const B = { img: u(blur, 'u_img'), dir: u(blur, 'u_dir') }
  const T = {
    img: u(tube, 'u_img'),
    bloom: u(tube, 'u_bloom'),
    src: u(tube, 'u_src'),
    time: u(tube, 'u_time'),
    surge: u(tube, 'u_surge'),
    glitch: u(tube, 'u_glitch'),
    flash: u(tube, 'u_flash'),
    power: u(tube, 'u_power'),
    motion: u(tube, 'u_motion'),
    cell: u(tube, 'u_cell'),
  }

  function pass(prog: WebGLProgram, out: Target | null, w: number, h: number): void {
    gl.useProgram(prog)
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fbo : null)
    gl.viewport(0, 0, w, h)
  }

  function bind(unit: number, tex: WebGLTexture, loc: WebGLUniformLocation | null): void {
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.uniform1i(loc, unit)
  }

  return {
    canvas,
    draw(source, params) {
      if (gl.isContextLost()) return
      const w = source.width
      const h = source.height
      if (!w || !h) return
      if (!read || read.w !== w || read.h !== h) {
        for (const t of [read, write, bloomA, bloomB]) drop(gl, t)
        read = target(gl, w, h)
        write = target(gl, w, h)
        const bw = Math.max(1, Math.round(w / 4))
        const bh = Math.max(1, Math.round(h / 4))
        bloomA = target(gl, bw, bh)
        bloomB = target(gl, bw, bh)
      }
      const a = bloomA!
      const b = bloomB!

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, srcTex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)

      pass(persist, write!, w, h)
      bind(0, srcTex, P.src)
      bind(1, read.tex, P.prev)
      gl.uniform1f(P.decay, params.motion > 0 ? Math.pow(0.7, params.dt * 60) : 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      pass(down, a, a.w, a.h)
      bind(0, write!.tex, D.img)
      gl.uniform2f(D.px, 1 / w, 1 / h)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      for (const spread of [1, 2.2]) {
        pass(blur, b, a.w, a.h)
        bind(0, a.tex, B.img)
        gl.uniform2f(B.dir, spread / a.w, 0)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        pass(blur, a, a.w, a.h)
        bind(0, b.tex, B.img)
        gl.uniform2f(B.dir, 0, spread / a.h)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }

      pass(tube, null, canvas.width, canvas.height)
      bind(0, write!.tex, T.img)
      bind(1, a.tex, T.bloom)
      gl.uniform2f(T.src, w, h)
      gl.uniform1f(T.time, params.time)
      gl.uniform1f(T.surge, params.surge)
      gl.uniform1f(T.glitch, params.glitch * params.motion)
      gl.uniform1f(T.flash, params.flash)
      gl.uniform1f(T.power, params.power)
      gl.uniform1f(T.motion, params.motion)
      gl.uniform1f(T.cell, params.cell)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      const swap = read
      read = write
      write = swap
    },
  }
}
