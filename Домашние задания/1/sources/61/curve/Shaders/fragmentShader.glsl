#version 300 es
precision mediump float;

in vec4 v_color;
out vec4 colorsOut;

void main() {
  colorsOut = v_color;
}