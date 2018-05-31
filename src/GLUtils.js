export function createShader(gl, type, source) {
  console.log(source);
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  } else {
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }
}
  
export function createProgram(gl, vertexShaderSrc, fragmentShaderSrc) {
  const program = gl.createProgram();
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  } else {
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }
}

export function isValidGLSLVarName(name) {
  const varRegexp = /^[a-zA-Z_]\w*$/;
  return name.match(varRegexp);
}

export function getDefaultGlslFragSrc() {
  return `
  void main() {
    gl_FragColor = vec4(1, 0, 1, 1);
  }`
}

export function getDefaultGlslVertSrc() {
  return `
  attribute vec2 xy_pos;
  void main() {
    gl_Position = vec4(xy_pos, 0, 1);
  }`;
}