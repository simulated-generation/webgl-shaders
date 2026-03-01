const controls = new Map();
// program -> Map(uniformName -> WebGLUniformLocation|null)
const uniformCache = new Map();

export function setControl(path, value) {
  controls.set(path, value);
}

export function getControl(path, fallback = 0.0) {
  const v = controls.get(path);
  return (v === undefined) ? fallback : v;
}

export function updateUniforms(gl, program) {
  let progMap = uniformCache.get(program);
  if (!progMap) {
    progMap = new Map();
    uniformCache.set(program, progMap);
  }

  for (const [path, value] of controls.entries()) {
    const uniformName = pathToUniform(path);
    let loc = progMap.get(uniformName);
    if (loc === undefined) {
      loc = gl.getUniformLocation(program, uniformName);
      progMap.set(uniformName, loc); // may be null
    }
    if (loc) gl.uniform1f(loc, value);
  }
}

export function pathToUniform(path) {
  return (
    "u_" +
    path
      .split("/")
      .filter(Boolean)
      .join("_")
  );
}
