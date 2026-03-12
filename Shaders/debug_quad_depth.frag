#version 410 core
out vec4 FragColor;

in vec2 TexCoords;

uniform sampler2DArray depthMap;
uniform float near_plane;
uniform float far_plane;
uniform bool layer;

float LinearizeDepth(float depth)
{
    float z = depth * 2.0 - 1.0;
    return (2.0 * near_plane * far_plane) / (far_plane + near_plane - z * (far_plane - near_plane));
}

void main()
{
    float depthValue = texture(depthMap, vec3(TexCoords, layer)).r;
    FragColor = vec4(vec3(depthValue), 1.0);
}