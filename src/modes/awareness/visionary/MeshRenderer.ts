import { WebGLMeshRenderer } from './WebGLMeshRenderer.ts';
import { project, type Camera, type Mesh, type Vertex, type ScreenPoint } from './mesh.ts';
interface Triangle {
  points: ScreenPoint[];
  uv: Vertex[];
  depth: number;
}
/** Subdivided perspective texture mapping with back-to-front depth ordering. No GPU context required. */
export class MeshRenderer {
  private gpu: WebGLMeshRenderer | null = null;
  private attempted = false;
  dispose() {
    this.gpu?.dispose();
    this.gpu = null;
    this.attempted = false;
  }
  draw(
    ctx: CanvasRenderingContext2D,
    meshes: Mesh[],
    texture: HTMLCanvasElement,
    camera: Camera,
    opacity = 1,
    lighting = true,
  ) {
    if (!this.attempted) {
      this.attempted = true;
      try {
        this.gpu = new WebGLMeshRenderer();
      } catch {
        this.gpu = null;
      }
    }
    if (this.gpu) {
      try {
        this.gpu.draw(meshes, texture, camera, opacity, lighting);
        ctx.drawImage(this.gpu.canvas, 0, 0);
        return;
      } catch {
        this.gpu.dispose();
        this.gpu = null;
      }
    }
    const triangles: Triangle[] = [];
    for (const mesh of meshes) {
      const projected = mesh.vertices.map((v) => project(v, camera));
      for (let i = 0; i < mesh.indices.length; i += 3) {
        const ids = mesh.indices.slice(i, i + 3),
          points = ids.map((id) => projected[id]);
        if (points.some((p) => !p)) continue;
        const screen = points as ScreenPoint[];
        if (
          screen.every((p) => p.x < 0) ||
          screen.every((p) => p.x > 960) ||
          screen.every((p) => p.y < 0) ||
          screen.every((p) => p.y > 540)
        )
          continue;
        const uv = ids.map((id) => mesh.vertices[id]);
        triangles.push({
          points: screen,
          uv,
          depth: (screen[0].z + screen[1].z + screen[2].z) / 3,
        });
      }
    }
    triangles.sort((a, b) => b.depth - a.depth);
    for (const triangle of triangles) this.triangle(ctx, texture, triangle, opacity);
  }
  private triangle(
    ctx: CanvasRenderingContext2D,
    texture: HTMLCanvasElement,
    t: Triangle,
    opacity: number,
  ) {
    const [a, b, c] = t.points;
    const [s0, s1, s2] = t.uv.map((v) => ({ x: v.u * texture.width, y: v.v * texture.height }));
    const det = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
    if (
      Math.abs(det) < 0.001 ||
      Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) < 0.02
    )
      return;
    const solve = (p: number, q: number, r: number) => [
      (p * (s1.y - s2.y) + q * (s2.y - s0.y) + r * (s0.y - s1.y)) / det,
      (p * (s2.x - s1.x) + q * (s0.x - s2.x) + r * (s1.x - s0.x)) / det,
      (p * (s1.x * s2.y - s2.x * s1.y) +
        q * (s2.x * s0.y - s0.x * s2.y) +
        r * (s0.x * s1.y - s1.x * s0.y)) /
        det,
    ];
    const x = solve(a.x, b.x, c.x),
      y = solve(a.y, b.y, c.y);
    ctx.save();
    ctx.beginPath();
    // Slightly overlap adjacent triangles to avoid transparent rasterization seams.
    const center = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
    [a, b, c].forEach((p, i) => {
      const dx = p.x - center.x,
        dy = p.y - center.y,
        len = Math.hypot(dx, dy) || 1;
      const px = p.x + (dx / len) * 0.45,
        py = p.y + (dy / len) * 0.45;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = opacity;
    ctx.transform(x[0], y[0], x[1], y[1], x[2], y[2]);
    ctx.drawImage(texture, 0, 0);
    ctx.restore();
  }
}
