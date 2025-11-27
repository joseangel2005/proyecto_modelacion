#version 300 es
precision highp float;

in vec4 v_color;
uniform vec4 u_color;

const int MAX_LIGHTS = 16;

in vec3 v_normal;
in vec3 v_surfaceToLight[MAX_LIGHTS];
in vec3 v_surfaceToView;

// Scene uniforms
uniform vec4 u_ambientLight[MAX_LIGHTS];
uniform vec4 u_diffuseLight[MAX_LIGHTS];
uniform vec4 u_specularLight[MAX_LIGHTS];

// Model uniforms
uniform vec4 u_ambientColor;
uniform vec4 u_diffuseColor;
uniform vec4 u_specularColor;
uniform float u_shininess;

uniform int u_numLights;

out vec4 outColor;

void main() {
    outColor = u_color;

    // v_normal must be normalized because the shader will interpolate
    // it for each fragment
    vec3 normal = normalize(v_normal);

    vec4 ambientColor  = vec4(0.0);
    vec4 diffuseColor  = vec4(0.0);
    vec4 specularColor = vec4(0.0);

    for (int i = 0; i < MAX_LIGHTS; ++i) {
        if (i >= u_numLights) break;

        vec3 surfToLightDir = normalize(v_surfaceToLight[i]);
        vec3 surfToViewDir  = normalize(v_surfaceToView);

        float diffuse = max(dot(normal, surfToLightDir), 0.0);
        float specular = 0.0;

        if (diffuse > 0.0) {
            // reflejo estilo Phong
            vec3 r = reflect(-surfToLightDir, normal);
            specular = pow(max(dot(surfToViewDir, r), 0.0), u_shininess);
        }

        ambientColor  += u_ambientLight[i] * u_ambientColor;
        diffuseColor  += u_diffuseLight[i] * u_diffuseColor * diffuse;
        specularColor += u_specularLight[i] * u_specularColor * specular;
    }

    outColor = ambientColor + diffuseColor + specularColor;
}
