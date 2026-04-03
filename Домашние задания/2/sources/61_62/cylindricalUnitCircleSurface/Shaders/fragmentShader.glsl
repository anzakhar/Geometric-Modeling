#version 300 es
precision mediump float;
in vec4 v_color;
in vec4 v_normal;
in vec4 v_position;
uniform bool u_drawPolygon;
uniform vec3 u_LightColor;     // Light color
uniform vec4 u_LightPosition; // Position of the light source (in the world coordinate system)
uniform vec3 u_AmbientLight;   // Color of an ambient light
uniform vec3 u_colorAmbient;
uniform vec3 u_colorSpec;
uniform float u_shininess;
out vec4 colorsOut;
void main() {
  if (u_drawPolygon) {
    // Make the length of the normal 1.0
    vec3 normal =  normalize(gl_FrontFacing ? v_normal.xyz : -v_normal.xyz);
    // Calculate the light direction and make it 1.0 in length
    vec3 lightDirection = normalize(vec3(u_LightPosition - v_position));
    // Dot product of the light direction and the orientation of a surface (the normal)
    float nDotL = max(dot(lightDirection, normal), 0.0);
    // Calculate the color due to diffuse reflection
    vec3 diffuse = u_LightColor * v_color.rgb * nDotL;
    // Calculate the color due to ambient reflection
    vec3 ambient = u_AmbientLight * u_colorAmbient;
    vec3 r = reflect( -lightDirection, normal );
    vec3 spec = vec3(0.0);
    if( nDotL > 0.0 )
      spec = u_LightColor * u_colorSpec *
             pow( max( dot(r,lightDirection), 0.0 ), u_shininess );
    
    // Add the surface colors due to diffuse reflection and ambient reflection
    colorsOut = vec4(spec + diffuse + ambient, v_color.a);
  } else {
    colorsOut = v_color;
  }
}