#version 300 es

// Atributos de vértice
in vec4 a_position;
in vec3 a_normal;
in vec2 a_texcoord;

// Matrices
uniform mat4 u_world;
uniform mat4 u_worldInverseTransform;
uniform mat4 u_worldViewProjection;

// Varyings hacia el fragment shader
out vec3 v_worldPosition;
out vec3 v_normal;
out vec2 v_texcoord;

void main() {
    // Posición del vértice en espacio mundial
    vec4 worldPosition = u_world * a_position;
    v_worldPosition = worldPosition.xyz;

    // Normal transformada a espacio mundial
    // (u_worldInverseTransform es la inversa transpuesta del mundo)
    v_normal = mat3(u_worldInverseTransform) * a_normal;

    // Coordenadas de textura pasan directo
    v_texcoord = a_texcoord;

    // Posición final en clip space
    gl_Position = u_worldViewProjection * a_position;
}