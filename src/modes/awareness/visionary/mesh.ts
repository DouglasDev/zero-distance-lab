export interface Vertex {
  x: number;
  y: number;
  z: number;
  u: number;
  v: number;
}
export interface Mesh {
  vertices: Vertex[];
  indices: number[];
  hue: number;
}
export interface Camera {
  x: number;
  y: number;
  z: number;
  focal: number;
}
export interface ScreenPoint {
  x: number;
  y: number;
  z: number;
}
export function project(p: Vertex, camera: Camera): ScreenPoint | null {
  const z = p.z - camera.z;
  if (z <= 0.2) return null;
  return {
    x: 480 + ((p.x - camera.x) * camera.focal) / z,
    y: 270 - ((p.y - camera.y) * camera.focal) / z,
    z,
  };
}
export function grid(
  columns: number,
  rows: number,
  point: (u: number, v: number) => Vertex,
  hue = 0,
): Mesh {
  const vertices: Vertex[] = [],
    indices: number[] = [];
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x <= columns; x++) vertices.push(point(x / columns, y / rows));
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const a = y * (columns + 1) + x,
        b = a + 1,
        c = a + columns + 1,
        d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  return { vertices, indices, hue };
}
const gaussian = (u: number, v: number, x: number, y: number, sx: number, sy: number) =>
  Math.exp(-(((u - x) / sx) ** 2 + ((v - y) / sy) ** 2));
/** Actual relief geometry: brow, eye sockets, nose, lips and cheek curvature. */
export function sculptedFace(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  yaw: number,
  detail = 12,
  hue = 0,
): Mesh {
  return grid(
    detail,
    Math.round(detail * 1.25),
    (u, v) => {
      const taper = Math.sin(Math.PI * v) ** 0.25 * (1 - 0.15 * v);
      const px = (u - 0.5) * width * taper,
        py = (0.5 - v) * height;
      const relief =
        0.5 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) +
        0.75 * gaussian(u, v, 0.5, 0.5, 0.085, 0.18) -
        0.24 * (gaussian(u, v, 0.3, 0.46, 0.11, 0.07) + gaussian(u, v, 0.7, 0.46, 0.11, 0.07)) +
        0.2 * gaussian(u, v, 0.5, 0.73, 0.22, 0.045);
      const pz = -relief * width * 0.3;
      return {
        x: x + px * Math.cos(yaw) + pz * Math.sin(yaw),
        y: y + py,
        z: z - px * Math.sin(yaw) + pz * Math.cos(yaw),
        u,
        v,
      };
    },
    hue,
  );
}
export function chamberSurfaces(): Mesh[] {
  const meshes: Mesh[] = [];
  // Curved vault panels, each with its own repeating living texture.
  for (let depth = 0; depth < 5; depth++)
    for (let sector = 0; sector < 10; sector++) {
      meshes.push(
        grid(
          4,
          3,
          (u, v) => {
            const a = ((sector + u) / 10) * Math.PI * 2,
              r = 4.4 + Math.sin(v * Math.PI) * 0.12;
            return {
              x: Math.cos(a) * r,
              y: Math.sin(a) * r * 0.85,
              z: 3 + depth * 5 + v * 5,
              u,
              v,
            };
          },
          depth * 27 + sector * 11,
        ),
      );
    }
  return meshes;
}
