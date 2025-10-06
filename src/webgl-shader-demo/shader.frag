#version 300 es
precision mediump float;

in vec2 vPos;
out vec4 fragColor;

// Parameters controlling e^{(a*i*2π + b)*x}
const float a = 0.2;   // imaginary frequency
const float b = 0.3;  // real growth/decay
const float scale = 2.0;  // view zoom (larger = zoom out)

// Convert the complex exponential function
vec2 complexExp(vec2 z) {
    // z = (b + i*omega) * x
    // e^{z} = e^{Re(z)} * (cos(Im(z)) + i*sin(Im(z)))
    float ex = exp(z.x);
    return ex * vec2(cos(z.y), sin(z.y));
}

void main() {
    // Map fragment coordinates from [-1,1] range
    vec2 uv = vPos * scale;

    // Compute the function value for this x (we'll use x = uv.x)
    float x = uv.x;
    float y = uv.y;

    float thickness = 0.01;
    // Compute f(x)
    //vec2 f = complexExp(vec2(b * x, a * 2.0 * 3.1415926 * x));

    // The screen coordinate represents the complex plane (Re = x, Im = y)
    // We check how close the pixel’s y is to f(x).y, and how close its x to f(x).x.
    // But we only want to draw the curve f(x) across visible x values.

    vec2 xAxis = vec2(x,0.0);
    float distXAxis = length(uv - xAxis);
    vec2 yAxis = vec2(0.0,y);
    float distYAxis = length(uv - yAxis);

    float axis = smoothstep(thickness, 0.0, distXAxis);
    axis      += smoothstep(thickness, 0.0, distYAxis);

    vec2 f = vec2(x,exp(x));

    // Distance from pixel to curve in complex plane
    float dist = length(uv - f);

    // Thickness of the curve

    // Draw white where the pixel is close to f(x)
    float intensity = smoothstep(thickness, 0.0, dist);

    // Optional: faint grid or background tone
    vec3 color = vec3(intensity+axis);

    fragColor = vec4(color, 1.0);
}

