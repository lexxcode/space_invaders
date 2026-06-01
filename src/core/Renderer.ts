/// <reference types="@webgpu/types" />
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
  tex: GPUTexture;
  bindGroup: GPUBindGroup;
  w: number;
  h: number;
}

interface TextCommand {
  bindGroup: GPUBindGroup;
  x: number;
  y: number;
  w: number;
  h: number;
}

const FLOATS_PER_VERTEX = 6; // x, y, r, g, b, a
const VERTS_PER_QUAD = 6;

const QUAD_WGSL = `
struct U { res: vec2<f32> };
@group(0) @binding(0) var<uniform> u: U;
struct VOut { @builtin(position) pos: vec4<f32>, @location(0) color: vec4<f32> };
@vertex fn vs(@location(0) p: vec2<f32>, @location(1) c: vec4<f32>) -> VOut {
  var o: VOut;
  let clip = vec2<f32>(p.x / u.res.x * 2.0 - 1.0, 1.0 - p.y / u.res.y * 2.0);
  o.pos = vec4<f32>(clip, 0.0, 1.0);
  o.color = c;
  return o;
}
@fragment fn fs(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> { return color; }
`;

const TEXT_WGSL = `
struct U { res: vec2<f32> };
@group(0) @binding(0) var<uniform> u: U;
@group(1) @binding(0) var samp: sampler;
@group(1) @binding(1) var tex: texture_2d<f32>;
struct VOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> };
@vertex fn vs(@location(0) p: vec2<f32>, @location(1) uv: vec2<f32>) -> VOut {
  var o: VOut;
  let clip = vec2<f32>(p.x / u.res.x * 2.0 - 1.0, 1.0 - p.y / u.res.y * 2.0);
  o.pos = vec4<f32>(clip, 0.0, 1.0);
  o.uv = uv;
  return o;
}
@fragment fn fs(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  return textureSample(tex, samp, uv);
}
`;

const BLEND: GPUBlendState = {
  color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
};

/** WebGPU renderer exposing the same 2D-style drawing API the game already
 *  uses. Coloured rectangles (incl. pixel sprites) are batched into one vertex
 *  buffer; text is rasterized to a texture and drawn as textured quads. */
export class Renderer {
  readonly canvas: HTMLCanvasElement;

  /** Milliseconds elapsed since the previous frame. */
  dt = 0;
  fps = 0;

  private frames = 10;
  private prevTick = performance.now();
  private diffStack = 0;

  private readonly device: GPUDevice;
  private readonly context: GPUCanvasContext;

  private readonly quadPipeline: GPURenderPipeline;
  private readonly textPipeline: GPURenderPipeline;
  private readonly sampler: GPUSampler;
  private readonly uniformBuffer: GPUBuffer;
  private readonly quadResBindGroup: GPUBindGroup;
  private readonly textResBindGroup: GPUBindGroup;

  private quadVertexBuffer: GPUBuffer | null = null;
  private textVertexBuffer: GPUBuffer | null = null;

  private quadData = new Float32Array(FLOATS_PER_VERTEX * VERTS_PER_QUAD * 4096);
  private quadVertices = 0;

  private readonly textCmds: TextCommand[] = [];
  private readonly textCache = new Map<string, TextEntry>();
  private readonly textCanvas = document.createElement('canvas');
  private readonly textCtx: CanvasRenderingContext2D;

  private readonly colorCache = new Map<string, RGBA>();
  private clearColor: RGBA = [0, 0, 0, 1];

  /** WebGPU device acquisition is async, so construct via this factory. */
  static async create(parent: HTMLElement): Promise<Renderer> {
    if (!navigator.gpu) throw new Error('WebGPU is not supported in this browser');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No suitable GPU adapter found');
    const device = await adapter.requestDevice();

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS.width;
    canvas.height = CANVAS.height;
    canvas.classList.add('cnvs');

    const context = canvas.getContext('webgpu');
    if (!context) throw new Error('WebGPU canvas context is not available');
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });

    return new Renderer(parent, canvas, device, context, format);
  }

  private constructor(
    parent: HTMLElement,
    canvas: HTMLCanvasElement,
    device: GPUDevice,
    context: GPUCanvasContext,
    format: GPUTextureFormat,
  ) {
    this.canvas = canvas;
    this.device = device;
    this.context = context;
    parent.appendChild(canvas);

    const textCtx = this.textCanvas.getContext('2d');
    if (!textCtx) throw new Error('2D context (for text rasterization) is not available');
    this.textCtx = textCtx;

    const quadModule = device.createShaderModule({ code: QUAD_WGSL });
    this.quadPipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: quadModule,
        entryPoint: 'vs',
        buffers: [
          {
            arrayStride: FLOATS_PER_VERTEX * 4,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x2' },
              { shaderLocation: 1, offset: 8, format: 'float32x4' },
            ],
          },
        ],
      },
      fragment: { module: quadModule, entryPoint: 'fs', targets: [{ format, blend: BLEND }] },
      primitive: { topology: 'triangle-list' },
    });

    const textModule = device.createShaderModule({ code: TEXT_WGSL });
    this.textPipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: textModule,
        entryPoint: 'vs',
        buffers: [
          {
            arrayStride: 4 * 4,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x2' },
              { shaderLocation: 1, offset: 8, format: 'float32x2' },
            ],
          },
        ],
      },
      fragment: { module: textModule, entryPoint: 'fs', targets: [{ format, blend: BLEND }] },
      primitive: { topology: 'triangle-list' },
    });

    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    this.uniformBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([canvas.width, canvas.height, 0, 0]));

    this.quadResBindGroup = device.createBindGroup({
      layout: this.quadPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });
    this.textResBindGroup = device.createBindGroup({
      layout: this.textPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });
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

    this.textCmds.push({ bindGroup: entry.bindGroup, x: px, y: py, w: entry.w, h: entry.h });
  }

  /** Flush the frame: clear the target and issue the batched draws. */
  present(): void {
    const device = this.device;
    const encoder = device.createCommandEncoder();
    const [r, g, b, a] = this.clearColor;
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r, g, b, a },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    if (this.quadVertices > 0) {
      const data = this.quadData.subarray(0, this.quadVertices * FLOATS_PER_VERTEX);
      this.quadVertexBuffer = this.ensureBuffer(this.quadVertexBuffer, data.byteLength);
      device.queue.writeBuffer(this.quadVertexBuffer, 0, data);
      pass.setPipeline(this.quadPipeline);
      pass.setBindGroup(0, this.quadResBindGroup);
      pass.setVertexBuffer(0, this.quadVertexBuffer);
      pass.draw(this.quadVertices);
    }

    if (this.textCmds.length > 0) {
      const floats = new Float32Array(this.textCmds.length * 6 * 4);
      let o = 0;
      for (const cmd of this.textCmds) {
        const x2 = cmd.x + cmd.w;
        const y2 = cmd.y + cmd.h;
        floats.set(
          [cmd.x, cmd.y, 0, 0, x2, cmd.y, 1, 0, cmd.x, y2, 0, 1, cmd.x, y2, 0, 1, x2, cmd.y, 1, 0, x2, y2, 1, 1],
          o,
        );
        o += 24;
      }
      this.textVertexBuffer = this.ensureBuffer(this.textVertexBuffer, floats.byteLength);
      device.queue.writeBuffer(this.textVertexBuffer, 0, floats);
      pass.setPipeline(this.textPipeline);
      pass.setBindGroup(0, this.textResBindGroup);
      pass.setVertexBuffer(0, this.textVertexBuffer);
      this.textCmds.forEach((cmd, i) => {
        pass.setBindGroup(1, cmd.bindGroup);
        pass.draw(6, 1, i * 6);
      });
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
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

  private ensureBuffer(buffer: GPUBuffer | null, neededBytes: number): GPUBuffer {
    if (buffer && buffer.size >= neededBytes) return buffer;
    const size = Math.max(neededBytes, (buffer?.size ?? 256) * 2);
    buffer?.destroy();
    return this.device.createBuffer({ size, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
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

    const device = this.device;
    const tex = device.createTexture({
      size: [w, h],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture({ source: this.textCanvas }, { texture: tex }, [w, h]);

    const bindGroup = device.createBindGroup({
      layout: this.textPipeline.getBindGroupLayout(1),
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: tex.createView() },
      ],
    });

    const entry: TextEntry = { tex, bindGroup, w, h };
    this.textCache.set(key, entry);
    return entry;
  }

  private clearTextCache(): void {
    for (const entry of this.textCache.values()) entry.tex.destroy();
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
}
