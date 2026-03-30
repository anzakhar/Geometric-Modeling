#version 300 es

in vec4 a_Position;
uniform mat4 u_projMatrix;
uniform float u_pointSize;
uniform vec4 u_color;
uniform vec4 u_colorSelect;
out vec4 v_color;
void main() {
  gl_Position = u_projMatrix * a_Position;
  gl_PointSize = u_pointSize;
  v_color = u_color;
}