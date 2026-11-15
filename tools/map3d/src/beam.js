
const GLSL_BEAM_V=`attribute vec3 aCol;varying vec3 vC;varying vec3 vW;void main(){vC=aCol;vec4 wp=modelMatrix*vec4(position,1.);vW=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`;
const GLSL_BEAM_F=`uniform vec2 uNt;uniform float uK;varying vec3 vC;varying vec3 vW;void main(){float s=smoothstep(-uK,uK,vW.x);float n=mix(uNt.x,uNt.y,s);gl_FragColor=vec4(vC*n*.85,1.);}`;