#version 300 es
precision highp float;

in vec4 v_color;
uniform vec4 u_color;

const int MAX_LIGHTS = 16;

in vec3 v_normal;
in vec3 v_surfaceToLight[MAX_LIGHTS];
in vec3 v_surfaceToView;

// Luces de la escena
uniform vec4 u_ambientLight[MAX_LIGHTS];
uniform vec4 u_diffuseLight[MAX_LIGHTS];
uniform vec4 u_specularLight[MAX_LIGHTS];

// Colores del material
uniform vec4 u_ambientColor;
uniform vec4 u_diffuseColor;
uniform vec4 u_specularColor;

uniform float u_shininess;

out vec4 outColor;

void main() {
    vec3 normal = normalize(v_normal);

    vec4 ambientColor  = vec4(0.0);
    vec4 diffuseColor  = vec4(0.0);
    vec4 specularColor = vec4(0.0);

    //Radio máximo de la luz
    float maxDistance = 2.0;  // prueba 4.0, 6.0, 8.0, etc.

    for (int i = 0; i < MAX_LIGHTS; ++i) {
        if (i >= MAX_LIGHTS) {
            break;
        }

        // Vector desde el fragmento hacia la luz
        vec3 toLight = v_surfaceToLight[i];

        // Distancia desde la luz al fragmento
        float distance = length(toLight);

        // Direcciones normalizadas
        vec3 surfToLightDir = normalize(toLight);
        vec3 surfToViewDir  = normalize(v_surfaceToView);

        // Difusa
        float diffuse = max(dot(normal, surfToLightDir), 0.0);
        float specular = 0.0;

        if (diffuse > 0.0) {
            // Reflejo Phong
            vec3 r = reflect(-surfToLightDir, normal);
            specular = pow(max(dot(surfToViewDir, r), 0.0), u_shininess);
        }

        if (i == 0) {
            ambientColor  += u_ambientLight[i]  * u_ambientColor;
            diffuseColor  += u_diffuseLight[i]  * u_diffuseColor  * diffuse;
            specularColor += u_specularLight[i] * u_specularColor * specular;
        }
        else {
            // Si está más lejos que el radio, esta luz no afecta este fragmento
            if (distance < maxDistance) {
                continue;
            }

            float falloff = 1.0 - (distance / maxDistance);
            falloff = clamp(falloff, 0.0, 1.0);
            float attenuation = falloff * falloff;

            // Ambient muy bajo para estas luces puntuales
            ambientColor  += u_ambientLight[i]  * u_ambientColor * 0.1;
            diffuseColor  += u_diffuseLight[i]  * u_diffuseColor  * diffuse  * attenuation;
            specularColor += u_specularLight[i] * u_specularColor * specular * attenuation;
        }
    }

    outColor = ambientColor + diffuseColor + specularColor;
}