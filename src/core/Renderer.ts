import { CANVAS, COLORS } from '../config';

export interface TextOptions {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  font?: string;
  weight?: string;
}

type RGBA = [number, number, number, number];

interface TextEntry {
  tex: WebGLTexture;
  w: number;
  h: number;
}

interface TextCommand {
  tex: WebGLTexture;
  x: number;
  y: number;
  w: number;
  h: number;
}

const FLOATS_PER_VERTEX = 6; // x, y, r, g, b, a
const VERTS_PER_QUAD = 6;

const QUAD_VS = `#version 300 es
in vec2 a_pos;
in vec4 a_color;
uniform vec2 u_res;
out vec4 v_color;
void main() {
  vec2 clip = vec2(a_pos.x / u_res.x * 2.0 - 1.0, 1.0 - a_pos.y / u_res.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  v_color = a_color;
}`;

const QUAD_FS = `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 o_color;
void main() { o_color = v_color; }`;

const TEXT_VS = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
uniform vec2 u_res;
out vec2 v_uv;
void main() {
  vec2 clip = vec2(a_pos.x / u_res.x * 2.0 - 1.0, 1.0 - a_pos.y / u_res.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  v_uv = a_uv;
}`;

const TEXT_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
out vec4 o_color;
void main() { o_color = texture(u_tex, v_uv); }`;

/** WebGL2 renderer exposing the same 2D-style drawing API the game already
 *  uses. Coloured rectangles (incl. pixel sprites) are batched into a single
 *  buffer; text is rasterized to a texture and drawn as a textured quad. */
export class Renderer {
  readonly canvas: HTMLCanvasElement;

  /** Milliseconds elapsed since the previous frame. */
  dt = 0;
  fps = 0;

  private frames = 10;
  private prevTick = performance.now();
  private diffStack = 0;

  private readonly gl: WebGL2RenderingContext;

  private readonly quadProgram: WebGLProgram;
  private readonly quadVao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly quadResLoc: WebGLUniformLocation;
  private quadData = new Float32Array(FLOATS_PER_VERTEX * VERTS_PER_QUAD * 4096);
  private quadVertices = 0;

  private readonly textProgram: WebGLProgram;
  private readonly textVao: WebGLVertexArrayObject;
  private readonly textBuffer: WebGLBuffer;
  private readonly textResLoc: WebGLUniformLocation;
  private readonly textCmds: TextCommand[] = [];
  private readonly textCache = new Map<string, TextEntry>();
  private readonly textCanvas = document.createElement('canvas');
  private readonly textCtx: CanvasRenderingContext2D;

  private readonly colorCache = new Map<string, RGBA>();
  private clearColor: RGBA = [0, 0, 0, 1];

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS.width;
    this.canvas.height = CANVAS.height;
    this.canvas.classList.add('cnvs');

    const gl = this.canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    parent.appendChild(this.canvas);

    const textCtx = this.textCanvas.getContext('2d');
    if (!textCtx) throw new Error('2D context (for text rasterization) is not available');
    this.textCtx = textCtx;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    // Coloured-quad pipeline.
    this.quadProgram = this.createProgram(QUAD_VS, QUAD_FS);
    this.quadResLoc = this.uniform(this.quadProgram, 'u_res');
    this.quadBuffer = this.createBuffer();
    this.quadVao = this.createVao();
    gl.bindVertexArray(this.quadVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    this.attrib(this.quadProgram, 'a_pos', 2, FLOATS_PER_VERTEX * 4, 0);
    this.attrib(this.quadProgram, 'a_color', 4, FLOATS_PER_VERTEX * 4, 2 * 4);
    gl.bindVertexArray(null);

    // Text pipeline (textured quads).
    this.textProgram = this.createProgram(TEXT_VS, TEXT_FS);
    this.textResLoc = this.uniform(this.textProgram, 'u_res');
    this.textBuffer = this.createBuffer();
    this.textVao = this.createVao();
    gl.bindVertexArray(this.textVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textBuffer);
    this.attrib(this.textProgram, 'a_pos', 2, 4 * 4, 0);
    this.attrib(this.textProgram, 'a_uv', 2, 4 * 4, 2 * 4);
    gl.bindVertexArray(null);
  }

  // --- timing (unchanged) ---------------------------------------------------

  tick(): void {
    this.frames--;
    const now = performance.now();
    this.dt = now - this.prevTick;

    if (this.frames === 0) {
      this.diffStack += this.dt;
      this.fps = Math.round(1000 / (this.diffStack / 10));
      this.frames = 10;
      this.diffStack = 0;
    } else {
      this.diffStack += this.dt;
    }

    this.prevTick = now;
  }

  // --- public drawing API ---------------------------------------------------

  clear(): void {
    this.quadVertices = 0;
    this.textCmds.length = 0;
    this.clearColor = this.parseColor(COLORS.background);
  }

  fillRect(x: number, y: number, width: number, height: number, color: string): void {
    const c = this.parseColor(color);
    this.ensureQuadCapacity();
    const x2 = x + width;
    const y2 = y + height;
    this.pushVertex(x, y, c);
    this.pushVertex(x2, y, c);
    this.pushVertex(x, y2, c);
    this.pushVertex(x, y2, c);
    this.pushVertex(x2, y, c);
    this.pushVertex(x2, y2, c);
  }

  drawSprite(matrix: number[][], x: number, y: number, scale: number, color: string): void {
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c]) this.fillRect(x + c * scale, y + r * scale, scale, scale, color);
      }
    }
  }

  strokeRect(x: number, y: number, width: number, height: number, color: string, lineWidth = 2): void {
    this.fillRect(x, y, width, lineWidth, color);
    this.fillRect(x, y + height - lineWidth, width, lineWidth, color);
    this.fillRect(x, y, lineWidth, height, color);
    this.fillRect(x + width - lineWidth, y, lineWidth, height, color);
  }

  drawText(text: string, x: number, y: number, opts: TextOptions = {}): void {
    const {
      size = 16,
      color = '#fff',
      align = 'left',
      baseline = 'alphabetic',
      font = "'Courier New', monospace",
      weight = 'bold',
    } = opts;
    const entry = this.getTextTexture(text, size, color, weight, font);

    let px = x;
    if (align === 'center') px = x - entry.w / 2;
    else if (align === 'right' || align === 'end') px = x - entry.w;

    let py = y;
    if (baseline === 'middle') py = y - entry.h / 2;
    else if (baseline === 'bottom' || baseline === 'alphabetic' || baseline === 'ideographic') {
      py = y - entry.h;
    }

    this.textCmds.push({ tex: entry.tex, x: px, y: py, w: entry.w, h: entry.h });
  }

  /** Flush the frame: clear the framebuffer and issue the batched draws. */
  present(): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (this.quadVertices > 0) {
      gl.useProgram(this.quadProgram);
      gl.bindVertexArray(this.quadVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.quadData.subarray(0, this.quadVertices * FLOATS_PER_VERTEX), gl.DYNAMIC_DRAW);
      gl.uniform2f(this.quadResLoc, this.canvas.width, this.canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, this.quadVertices);
    }

    if (this.textCmds.length > 0) {
      gl.useProgram(this.textProgram);
      gl.bindVertexArray(this.textVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.textBuffer);
      gl.uniform2f(this.textResLoc, this.canvas.width, this.canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      for (const cmd of this.textCmds) {
        const x2 = cmd.x + cmd.w;
        const y2 = cmd.y + cmd.h;
        // prettier-ignore
        const verts = new Float32Array([
          cmd.x, cmd.y, 0, 0,
          x2,    cmd.y, 1, 0,
          cmd.x, y2,    0, 1,
          cmd.x, y2,    0, 1,
          x2,    cmd.y, 1, 0,
          x2,    y2,    1, 1,
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
        gl.bindTexture(gl.TEXTURE_2D, cmd.tex);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    }

    gl.bindVertexArray(null);
  }

  // --- internals ------------------------------------------------------------

  private pushVertex(x: number, y: number, c: RGBA): void {
    const i = this.quadVertices * FLOATS_PER_VERTEX;
    this.quadData[i] = x;
    this.quadData[i + 1] = y;
    this.quadData[i + 2] = c[0];
    this.quadData[i + 3] = c[1];
    this.quadData[i + 4] = c[2];
    this.quadData[i + 5] = c[3];
    this.quadVertices++;
  }

  private ensureQuadCapacity(): void {
    const needed = (this.quadVertices + VERTS_PER_QUAD) * FLOATS_PER_VERTEX;
    if (needed <= this.quadData.length) return;
    const grown = new Float32Array(this.quadData.length * 2);
    grown.set(this.quadData);
    this.quadData = grown;
  }

  private getTextTexture(text: string, size: number, color: string, weight: string, font: string): TextEntry {
    const key = `${text}|${size}|${color}|${weight}|${font}`;
    const cached = this.textCache.get(key);
    if (cached) return cached;

    if (this.textCache.size > 256) this.clearTextCache();

    const ctx = this.textCtx;
    const fontSpec = `${weight} ${size}px ${font}`;
    ctx.font = fontSpec;
    const metrics = ctx.measureText(text);
    const ascent = Math.ceil(metrics.actualBoundingBoxAscent || size * 0.8);
    const descent = Math.ceil(metrics.actualBoundingBoxDescent || size * 0.2);
    // Tightly fit the glyphs with a symmetric 1px pad so the texture's centre
    // matches the text's centre (needed for correct 'middle' alignment).
    const w = Math.max(1, Math.ceil(metrics.width) + 2);
    const h = Math.max(1, ascent + descent + 2);

    this.textCanvas.width = w;
    this.textCanvas.height = h;
    ctx.font = fontSpec; // resizing the canvas resets the context
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.fillText(text, 1, ascent + 1);

    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error('Failed to create texture');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.textCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const entry: TextEntry = { tex, w, h };
    this.textCache.set(key, entry);
    return entry;
  }

  private clearTextCache(): void {
    for (const entry of this.textCache.values()) this.gl.deleteTexture(entry.tex);
    this.textCache.clear();
  }

  private parseColor(color: string): RGBA {
    const cached = this.colorCache.get(color);
    if (cached) return cached;

    let rgba: RGBA = [0, 0, 0, 1];
    if (color.startsWith('#')) {
      let hex = color.slice(1);
      if (hex.length === 3) hex = hex.replace(/./g, (ch) => ch + ch);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      rgba = [r, g, b, a];
    } else if (color.startsWith('rgb')) {
      const nums = color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
      rgba = [(nums[0] ?? 0) / 255, (nums[1] ?? 0) / 255, (nums[2] ?? 0) / 255, nums[3] ?? 1];
    }

    this.colorCache.set(color, rgba);
    return rgba;
  }

  private createProgram(vsSrc: string, fsSrc: string): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create program');
    gl.attachShader(program, this.createShader(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(program, this.createShader(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    return program;
  }

  private createShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Shader compile failed: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  private createBuffer(): WebGLBuffer {
    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error('Failed to create buffer');
    return buffer;
  }

  private createVao(): WebGLVertexArrayObject {
    const vao = this.gl.createVertexArray();
    if (!vao) throw new Error('Failed to create vertex array');
    return vao;
  }

  private uniform(program: WebGLProgram, name: string): WebGLUniformLocation {
    const loc = this.gl.getUniformLocation(program, name);
    if (!loc) throw new Error(`Uniform "${name}" not found`);
    return loc;
  }

  private attrib(program: WebGLProgram, name: string, size: number, stride: number, offset: number): void {
    const gl = this.gl;
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
  }
}
