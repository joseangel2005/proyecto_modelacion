#version 300 es
precision highp float;

// Constante de número máximo de luces que usas en JS
const int MAX_LIGHTS = 2;
const int MAX_TRAFFIC_LIGHTS = 24; // NUEVO

// Info de la cámara y luces
uniform vec3 u_viewWorldPosition;
uniform vec3 u_lightWorldPosition[MAX_LIGHTS];
uniform vec4 u_ambientLight[MAX_LIGHTS];
uniform vec4 u_diffuseLight[MAX_LIGHTS];
uniform vec4 u_specularLight[MAX_LIGHTS];

uniform int  u_trafficLightCount;
uniform vec3 u_trafficLightPositions[MAX_TRAFFIC_LIGHTS];
uniform vec3 u_trafficLightColors[MAX_TRAFFIC_LIGHTS];
uniform float u_trafficLightMaxRadius;

// Colores del material
uniform vec4 u_color;          // color base del objeto
uniform vec4 u_ambientColor;
uniform vec4 u_diffuseColor;
uniform vec4 u_specularColor;
uniform float u_shininess;

// Textura opcional (para el piso, etc.)
uniform sampler2D u_texture;
uniform bool u_useTexture;

// ----- Parte especial para SEMÁFOROS -----
uniform bool u_isTrafficLight;   // true si este objeto es semáforo
uniform vec4 u_emissiveColor;    // color que "emite" (rojo/verde/amarillo)

// Varyings desde el VS
in vec3 v_worldPosition;
in vec3 v_normal;
in vec2 v_texcoord;

// Color final
out vec4 outColor;

void main() {
    // Normalizar normal y dirección hacia la cámara
    vec3 N = normalize(v_normal);
    vec3 V = normalize(u_viewWorldPosition - v_worldPosition);

    // Color base: textura o uniforme
    vec4 baseColor = u_color;
    if (u_useTexture) {
        baseColor = texture(u_texture, v_texcoord);
    }

    vec4 result = vec4(0.0);

    // Luz escenario
    for (int i = 0; i < MAX_LIGHTS; ++i) {
        vec3 L = normalize(u_lightWorldPosition[i] - v_worldPosition);
        vec3 R = reflect(-L, N);

        float lambert = max(dot(N, L), 0.0);

        vec4 ambient  = u_ambientLight[i]  * u_ambientColor  * baseColor;
        vec4 diffuse  = u_diffuseLight[i]  * u_diffuseColor  * baseColor * lambert;

        float specFactor = 0.0;
        if (lambert > 0.0) {
            specFactor = pow(max(dot(V, R), 0.0), u_shininess);
        }
        vec4 specular = u_specularLight[i] * u_specularColor * specFactor;

        result += ambient + diffuse + specular;
    }

    // Foco semaforo
    if (u_isTrafficLight) {
        // Centro del foco 
        vec2 center = vec2(0.5, 0.5);

        // Distancia del fragment al centro
        float dist = distance(v_texcoord, center);

        // Radio "fuerte" y borde suave
        float innerRadius = 0.15;
        float outerRadius = 0.22;

        // Máscara suave: 1 en el centro, 0 fuera del outerRadius
        float mask = 1.0 - smoothstep(innerRadius, outerRadius, dist);

        // Oscurecer el resto del semáforo para que resalte el foco
        result.rgb *= 0.3;

        // Emisión circular
        vec3 emissive = u_emissiveColor.rgb * mask * 2.0;
        result.rgb += emissive;
    }

    // Circulo de color en la calle
    float groundFactor = max(dot(normalize(N), vec3(0.0, 1.0, 0.0)), 0.0);

    if (groundFactor > 0.0 && u_trafficLightCount > 0) {
        float bestIntensity = 0.0;
        vec3 bestColor = vec3(0.0);

        for (int i = 0; i < MAX_TRAFFIC_LIGHTS; ++i) {
            if (i >= u_trafficLightCount) {
                break;
            }

            vec3 tlPos = u_trafficLightPositions[i];

            // Distancia en el plano XZ (no nos importa la altura)
            vec2 toFragXZ = v_worldPosition.xz - tlPos.xz;
            float dist = length(toFragXZ);

            if (dist < u_trafficLightMaxRadius) {
                float t = dist / u_trafficLightMaxRadius;

                // Caída suave: al centro 1, al borde 0, con curva más pronunciada
                float intensity = 1.0 - t;
                intensity = intensity * intensity;  // pow(intensity, 2.0)

                vec3 tlColor = u_trafficLightColors[i];

                // Nos quedamos con la luz MÁS INTENSA (la más cercana)
                if (intensity > bestIntensity) {
                    bestIntensity = intensity;
                    bestColor = tlColor;
                }
            }
        }

        if (bestIntensity > 0.0) {
            vec3 extraGroundLight = bestColor * bestIntensity;

            // Afecta más a superficies horizontales
            extraGroundLight *= groundFactor;

            // Factor global para bajar intensidad
            result.rgb += extraGroundLight * 0.5; // antes 1.0
        }
    }

    // Alfa viene del color base
    result.a = baseColor.a;
    outColor = result;
}