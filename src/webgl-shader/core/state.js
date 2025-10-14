// src/webgl-shader-demo/state.js

const controls = new Map();
const uniforms = new Map(); // uniformName -> WebGLUniformLocation

/**
 * Called when a new OSC control value arrives.
 */
export function setControl(path, value) {
  console.log("setting control value");
  console.log(path);
  controls.set(path, value);
}

/**
 * Called in the render loop to update all uniforms dynamically.
 */
export function updateUniforms(gl, program) {
  for (const [path, value] of controls.entries()) {
    const uniformName = pathToUniform(path);
    let loc = uniforms.get(uniformName);

    // Lazily resolve and cache uniform location
    if (!loc) {
      loc = gl.getUniformLocation(program, uniformName);
      if (loc) {
        uniforms.set(uniformName, loc);
        console.debug(`[uniform] registered ${uniformName}`);
      } else {
        // If not found, skip (shader doesn't define it)
        continue;
      }
    }

    // Update uniform value
    gl.uniform1f(loc, value);
  }
}

/**
 * Convert OSC paths like "/foo/bar" -> "uFooBar"
 */
export function pathToUniform(path) {
  return "u" + path
    .split("/")
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

