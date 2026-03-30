#version 300 es

in vec4 a_Position;
in float a_select;
in mat4 a_transformMatrix;
uniform mat4 u_projMatrix;
uniform bool u_useTransformMatrix;
uniform float u_pointSize;
uniform vec4 u_color;
uniform vec4 u_colorSelect;
out vec4 v_color;
void main() {
  if (u_useTransformMatrix)
    gl_Position = u_projMatrix * a_transformMatrix * a_Position;
  else
    gl_Position = u_projMatrix * a_Position;
  gl_PointSize = u_pointSize;
  if (a_select != 0.0)
    v_color = u_colorSelect;
  else
    v_color = u_color;
}