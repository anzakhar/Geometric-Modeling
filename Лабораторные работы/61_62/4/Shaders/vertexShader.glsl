#version 300 es

in vec4 a_Position;
in vec4 a_normal;
in mat4 a_transformMatrix;
uniform mat4 u_mvpMatrix;
uniform bool u_useTransformMatrix;
uniform float u_pointSize;
uniform vec4 u_color;
out vec4 v_color;
out vec4 v_normal;
out vec4 v_position;
void main() {
  if (u_useTransformMatrix)
    gl_Position = u_mvpMatrix * a_transformMatrix * a_Position;
  else
    gl_Position = u_mvpMatrix * a_Position;
    v_color = u_color;
    gl_PointSize = u_pointSize;
  v_normal = a_normal;
  v_position = a_Position;
}