import type { Camera, Mesh } from './mesh.ts';
const vertex = `
attribute vec3 position; attribute vec2 uv; attribute vec3 normal; attribute float hue;
uniform vec3 camera; uniform float focal;
varying vec2 texcoord; varying vec3 surfaceNormal; varying float pigment;
void main(){float z=position.z-camera.z;float near=0.2;float far=60.0;
 gl_Position=vec4((position.x-camera.x)*focal/480.0,(position.y-camera.y)*focal/270.0,
 (far+near)/(far-near)*z-2.0*far*near/(far-near),z);
 texcoord=uv;surfaceNormal=normal;pigment=hue;}`;
const fragment = `precision mediump float;
uniform sampler2D image;uniform float opacity;uniform float lighting;
varying vec2 texcoord;varying vec3 surfaceNormal;varying float pigment;
void main(){vec4 color=texture2D(image,texcoord);
 float light=0.64+0.36*abs(dot(normalize(surfaceNormal),normalize(vec3(-0.35,0.55,-1.0))));
 float tint=sin(pigment*0.01745)*0.20;
 vec3 rotated=mix(color.rgb,color.gbr,abs(tint));
 float alpha=color.a*opacity;gl_FragColor=vec4(rotated*mix(1.0,light,lighting)*alpha,alpha);}`;
/** One reusable GPU buffer/texture. Perspective-correct UVs, interpolated normals and a depth buffer. */
export class WebGLMeshRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private texture: WebGLTexture;
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 960;
    this.canvas.height = 540;
    const gl = this.canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message ?? 'Shader error');
      }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex),
      fs = compile(gl.FRAGMENT_SHADER, fragment),
      program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error('Could not link mesh shader');
    this.program = program;
    this.buffer = gl.createBuffer()!;
    this.texture = gl.createTexture()!;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    let offset = 0;
    for (const [name, size] of [
      ['position', 3],
      ['uv', 2],
      ['normal', 3],
      ['hue', 1],
    ] as const) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 36, offset * 4);
      offset += size;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0, 0, 0, 0);
  }
  draw(
    meshes: Mesh[],
    texture: HTMLCanvasElement,
    camera: Camera,
    opacity: number,
    lighting: boolean,
  ) {
    const gl = this.gl;
    if (gl.isContextLost()) throw new Error('Mesh context lost');
    const data = new Float32Array(meshes.reduce((n, mesh) => n + mesh.indices.length * 9, 0));
    let offset = 0;
    for (const mesh of meshes) {
      const normals = mesh.vertices.map(() => ({ x: 0, y: 0, z: 0 }));
      for (let i = 0; i < mesh.indices.length; i += 3) {
        const [ai, bi, ci] = mesh.indices.slice(i, i + 3),
          a = mesh.vertices[ai],
          b = mesh.vertices[bi],
          c = mesh.vertices[ci];
        const ux = b.x - a.x,
          uy = b.y - a.y,
          uz = b.z - a.z,
          vx = c.x - a.x,
          vy = c.y - a.y,
          vz = c.z - a.z;
        for (const index of [ai, bi, ci]) {
          normals[index].x += uy * vz - uz * vy;
          normals[index].y += uz * vx - ux * vz;
          normals[index].z += ux * vy - uy * vx;
        }
      }
      for (const index of mesh.indices) {
        const p = mesh.vertices[index],
          n = normals[index],
          len = Math.hypot(n.x, n.y, n.z) || 1;
        data.set([p.x, p.y, p.z, p.u, p.v, n.x / len, n.y / len, n.z / len, mesh.hue], offset);
        offset += 9;
      }
    }
    gl.useProgram(this.program);
    gl.viewport(0, 0, 960, 540);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
    gl.uniform1i(gl.getUniformLocation(this.program, 'image'), 0);
    gl.uniform3f(gl.getUniformLocation(this.program, 'camera'), camera.x, camera.y, camera.z);
    gl.uniform1f(gl.getUniformLocation(this.program, 'focal'), camera.focal);
    gl.uniform1f(gl.getUniformLocation(this.program, 'opacity'), opacity);
    gl.uniform1f(gl.getUniformLocation(this.program, 'lighting'), lighting ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, data.length / 9);
  }
  dispose() {
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteTexture(this.texture);
    this.gl.deleteProgram(this.program);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
