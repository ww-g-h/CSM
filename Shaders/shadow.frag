#version 410 core
out vec4 FragColor;

in VS_OUT{
    vec3 FragPos;
    vec3 Normal;
    vec2 TexCoords;
} fs_in;

uniform sampler2D diffuseTexture;
uniform sampler2DArray shadowMap;

uniform vec3 lightDir;
uniform vec3 viewPos;
uniform float farPlane;

uniform mat4 view;

layout(std140) uniform LightSpaceMatrices
{
    mat4 lightSpaceMatrices[16];
};
uniform float cascadePlaneDistances[16];
uniform int cascadeCount;

float ShadowCalculation(vec3 fragPosWorldSpace)
{
    vec4 fragPosViewSpace = view * vec4(fragPosWorldSpace, 1.0);
    float depth = abs(fragPosViewSpace.z);

    int layer = -1;
    for(int i = 0; i < cascadeCount; ++i)
    {
        if(depth < cascadePlaneDistances[i])
        {
            layer = i;
            break;
        }
    }
    if(layer == -1){
        layer = cascadeCount;
    }

    vec4 fragPosLightSpace = lightSpaceMatrices[layer] * vec4(fragPosWorldSpace, 1.0);
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    projCoords = projCoords * 0.5 + 0.5;

    float currentDepth = projCoords.z;
    if(currentDepth > 1.0)
    {
        return 1.0;
    }

    vec3 normal = normalize(fs_in.Normal);
    float bias = max(0.05*(1.0 - dot(normal, lightDir)), 0.005);
    const float biasModifier = 0.5;
    if(layer == cascadeCount)
    {
        bias *= 1/(farPlane * biasModifier);
    }
    else
    {
        bias *= 1/(cascadePlaneDistances[layer] * biasModifier);
    }

    float shadow = 0.0;
    vec2 texelSize = 1.0 / vec2(textureSize(shadowMap, 0));
    for(int x= -1;x<=1;++x)
    {
        for(int y= -1;y<=1;++y)
        {
            float pcfDepth = texture(shadowMap, vec3(projCoords.xy +vec2(x,y) * texelSize, layer)).r;
            shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;
        }
    }
    shadow /= 9.0;

    return shadow;
}

void main()
{
    vec3 color = texture(diffuseTexture, fs_in.TexCoords).rgb;
    vec3 normal = normalize(fs_in.Normal);
    vec3 lightColor = vec3(0.3);
    vec3 ambient = 0.3 * color;
    float diff = max(dot(lightDir,normal), 0.0);
    vec3 diffuse = diff * lightColor;
    vec3 viewDir = normalize(viewPos - fs_in.FragPos);
    float spec =0.0;
    vec3 halfwayVector = normalize(lightDir + viewDir);
    spec = pow(max(dot(normal, halfwayVector), 0.0), 64.0);
    vec3 specular = spec * lightColor;
    float shadow = ShadowCalculation(fs_in.FragPos);
    vec3 lighting =(ambient + (1.0 - shadow)*(diffuse + specular)) *color;
    FragColor = vec4(lighting, 1.0);
}