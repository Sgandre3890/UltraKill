// fragment.glsl
#version 330 core
out vec4 FragColor;

in vec3 FragPos;
in vec3 Normal;
in vec2 TexCoords;

uniform sampler2D texture_diffuse1;

void main()
{
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    float diff = max(dot(Normal, lightDir), 0.0);
    vec3 diffuse = diff * vec3(texture(texture_diffuse1, TexCoords));
    FragColor = vec4(diffuse, 1.0);
}
