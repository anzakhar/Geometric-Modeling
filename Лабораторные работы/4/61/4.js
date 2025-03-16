// 4.js

// Imports.
import {getShader} from './libs/prepShader.js';
import {initShaders} from './libs/cuon-utils.js';
import * as  dat from './libs/dat.gui.module.js';
import {glMatrix, vec3, vec4, quat, mat4} from './libs/dist/esm/index.js';
import {EventUtil} from './libs/EventUtil.js';

async function main() {
    // Retrieve <canvas> element
    const canvas = document.getElementById('webgl');
	canvas.width  = document.documentElement.clientWidth;
	canvas.height = document.documentElement.clientHeight;

    // Get the rendering context for WebGL
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Read shaders and create shader program executable.
    const vertexShader = await getShader(gl, "vertex", "Shaders/vertexShader.glsl");
    const fragmentShader = await getShader(gl, "fragment", "Shaders/fragmentShader.glsl");

    // Initialize shaders
    if (!initShaders(gl, vertexShader, fragmentShader)) {
        console.log('Failed to intialize shaders.');
        return;
    }

  const viewport = [0, 0, canvas.width, canvas.height];
  gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);

  const gui = new dat.GUI();
    // const guiViewParams = gui.addFolder('View parameters');
  	const guiSurfaceParams = gui.addFolder('Ruled surface parameters');
	const guiCountSurfacePoints = guiSurfaceParams.addFolder('Count ruled surface points');

  Data.init(gl, viewport);

  canvas.onmousemove = function (ev) { mousemove(ev, canvas); };

  canvas.onmousedown = function (ev) { mousedown(ev, canvas); };

  canvas.onmouseup = function (ev) { mouseup(ev, canvas); };

  (function () {

      function handleMouseWheel(event) {
          event = EventUtil.getEvent(event);
          const delta = EventUtil.getWheelDelta(event);
          Data.mousewheel(delta);
            EventUtil.preventDefault(event);
      }

        EventUtil.addHandler(canvas, "mousewheel", handleMouseWheel);
      EventUtil.addHandler(document, "DOMMouseScroll", handleMouseWheel);

  })();


  guiSurfaceParams.add(Data.controlsParameters, 'ruledSurface').onChange(function (e) { Data.calculateAndDraw(); });
  guiCountSurfacePoints.add(Data.controlsParameters, 'N', 2, 200, 1).onChange(function (e) { Data.generateBoundaryCurves(Data.controlsParameters.N); Data.calculateAndDraw(); });
  guiCountSurfacePoints.add(Data.controlsParameters, 'M', 2, 10, 1).onChange(function (e) { Data.calculateAndDraw(); });
	guiSurfaceParams.add(Data.controlsParameters, 'visualize', ["points", "lines", "surface"]).onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	guiSurfaceParams.add(Data.controlsParameters, 'showNormals').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
   
    // gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.DEPTH_TEST);

  // Specify the color for clearing <canvas>
  gl.clearColor(0.8, 0.8, 0.8, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  Data.generateBoundaryCurves(Data.controlsParameters.N);
}

class Point {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.transformMatrix = mat4.create();
    }
	setTransformMatrix(T) {
        this.transformMatrix = T;
    }
}

const Camera = {
    d: 0.0,
    //initial distance
    d0: 0.0,
    //point the viewer is looking at
	ref: vec3.create(),
    //up vector
	up: vec4.create(),
    //view volume bounds
    xw_min: 0.0,
    xw_max: 0.0,
    yw_min: 0.0,
    yw_max: 0.0,
    d_near: 0.0,
    d_far: 0.0,
	eye: vec4.create(),
	initValues: function (angle) {
		const D = this.d + this.d0;
		
		this.eye = vec4.fromValues(0.0, 0.0, D, 0.0);
		vec4.set(this.up, 0.0, 1.0, 0.0, 0.0);
		
		this.xw_min = -D;
        this.xw_max = D;
        this.yw_min = -D;
        this.yw_max = D;
        this.d_near = 0.0;
        this.d_far = 2 * D;
	},
	rotateHorizontal: function (angle) {
		let rotMat = mat4.create();
		let resEye = vec4.create();
		mat4.fromRotation(rotMat, angle, this.up);
		vec4.transformMat4(resEye, this.eye, rotMat);
		this.eye = resEye;
		//console.log("  angle = ", angle*180/Math.PI);
	},
	rotateVertical: function (angle) {
		let rotMat = mat4.create();
		let resEye = vec4.create();
		const lookVec = vec3.create();
		vec3.subtract(lookVec, this.eye, this.ref);
		const axisVec = vec3.create();
		vec3.cross(axisVec, lookVec, this.up);

		mat4.fromRotation(rotMat, angle, axisVec);
		vec4.transformMat4(resEye, this.eye, rotMat);
		this.eye = resEye;
		let resUp = vec4.create();
		vec4.transformMat4(resUp, this.up, rotMat);
		this.Vx = resUp[0];
        this.Vy = resUp[1];
        this.Vz = resUp[2];
		this.up = resUp;
		//console.log("  angle = ", angle*180/Math.PI);
		
	},
    normalizeAngle: function (angle) {
        let lAngle = angle;
        while (lAngle < 0)
            lAngle += 360 * 16;
        while (lAngle > 360 * 16)
            lAngle -= 360 * 16;

        return lAngle;
    },
    getLookAt: function (zoom, x, y) {
        this.d = zoom;
        const transform_y = glMatrix.toRadian(y / 16.0);
        const transform_x = glMatrix.toRadian(x / 16.0);
		this.initValues();
		this.rotateVertical(transform_y);
		this.rotateHorizontal(transform_x);
		//console.log("x0 = ", this.x0, "  y0 = ", this.y0, "  z0 = ", this.z0);
		//console.log("x_ref = ", this.x_ref, "  y_ref = ", this.y_ref, "  z_ref = ", this.z_ref);
		//console.log("Vx = ", this.Vx, "  Vy = ", this.Vy, "  Vz = ", this.Vz);

        return mat4.lookAt(mat4.create(), 
            this.eye, 
            this.ref, 
            this.up);
    },
    getProjMatrix: function() {
        return mat4.ortho(mat4.create(), 
            this.xw_min, this.xw_max, this.yw_min, this.yw_max, this.d_near, this.d_far);
    },
    getAxesPoints: function () {
    		return [0.5 * this.xw_min, 0, 0,
    						this.xw_max, 0, 0,
    						0, 0.5 * this.yw_min, 0,
    						0, this.yw_max, 0,
    						0, 0, -0.5 * (this.d_far - this.d_near) / 2.0,
    						0, 0,  (this.d_far - this.d_near) / 2.0];
    },
    getAxesTipLength: function () {
    		return 0.2 * (this.d_far - this.d_near);

    }
}

const Data = {
    
    indicesAxesTip: [],
	pointsSurface: [],
    indicesSurfaceLines: [],
    indicesSurfaceTriangles: [],
	indicesNormalVectorTip: [],
    normalsSurface: [],
    countAttribData: 3 + 16, //x,y,z
	verticesAxes: {},
    verticesC1: {},
    verticesC2: {},
    verticesSurface: {},
	verticesNormalVector: {},
	verticesNormalVectorTip: {},
    FSIZE: 0,
    ISIZE: 0,
    gl: null,
	vertexBufferAxes: null,
    vertexBufferAxesTip: null,
	indexBufferAxesTip: null,
    vertexBufferC1: null,
    vertexBufferC2: null,
    
	indexBufferCtr: null,
	vertexBufferSurface: null,
    indexBufferSurfaceLines: null,
    indexBufferSurfaceTriangles: null,
	vertexBufferNormalVector: null,
	vertexBufferNormalVectorTip: null,
    indexBufferNormalVectorTip: null,
	verticesAxesTip: {},
    a_Position: -1,
    a_normal: -1,
    a_transformMatrix: -1,
    u_color: null,
    u_pointSize: null,
    u_drawPolygon: false,
    u_useTransformMatrix: false,
    u_mvpMatrix: null,
    u_LightColor: null,
    u_LightPosition: null,
    u_AmbientLight: null,
    u_colorAmbient: null,
    u_colorSpec: null,
    u_shininess: null,
    leftButtonDown: false,
    xRot: 0,
    yRot: 0,
    wheelDelta: 0.0,
    proj: mat4.create(),
    cam: mat4.create(),
    world: mat4.create(),
    viewport: [],
    lastPosX: 0,
    lastPosY: 0,
    nLongitudes: 0,
    nLatitudes: 0,
	lengthVector: 0.0,
	heighTip: 0.0,
	controlsParameters: {
		// theta: 0.0,
		// phi: 0.0
		ruledSurface: false,
		visualize: "points",
		N: 50,
		M: 2,
		showNormals: false
	},
    init: function (gl, viewport) {
        this.gl = gl;
        
        this.verticesAxes = new Float32Array(18); // 6 points * 3 coordinates
        
        // Create a buffer object
        this.vertexBufferAxes = this.gl.createBuffer();
        if (!this.vertexBufferAxes) {
            console.log('Failed to create the buffer object for axes');
            return -1;
        }
        
        this.vertexBufferAxesTip = this.gl.createBuffer();
        if (!this.vertexBufferAxesTip) {
            console.log('Failed to create the buffer object for axes tips');
            return -1;
        }
        
        this.vertexBufferC1 = this.gl.createBuffer();
        if (!this.vertexBufferC1) {
            console.log('Failed to create the buffer object for curve 1');
            return -1;
        }
        this.vertexBufferC2 = this.gl.createBuffer();
        if (!this.vertexBufferC2) {
            console.log('Failed to create the buffer object for curve 2');
            return -1;
        }
        this.vertexBufferSurface = this.gl.createBuffer();
        if (!this.vertexBufferSurface) {
            console.log('Failed to create the buffer object for surface points');
            return -1;
        }
        
        this.indexBufferAxesTip = this.gl.createBuffer();
        if (!this.indexBufferAxesTip) {
            console.log('Failed to create the index object for axes tips');
            return -1;
        }

        this.indexBufferSurfaceLines = this.gl.createBuffer();
        if (!this.indexBufferSurfaceLines) {
            console.log('Failed to create the index object for surface lines');
            return -1;
        }

        this.indexBufferSurfaceTriangles = this.gl.createBuffer();
        if (!this.indexBufferSurfaceTriangles) {
            console.log('Failed to create the index object for surface triangles');
            return -1;
        }
		
		this.vertexBufferNormalVector = this.gl.createBuffer();
		if (!this.vertexBufferNormalVector) {
			console.log('Failed to create the buffer object for normal vector');
			return -1;
        }
		
		this.vertexBufferNormalVectorTip = this.gl.createBuffer();
        if (!this.vertexBufferNormalVectorTip) {
            console.log('Failed to create the buffer object for vector 10 tips');
            return -1;
        }

        this.indexBufferNormalVectorTip = this.gl.createBuffer();
        if (!this.indexBufferNormalVectorTip) {
            console.log('Failed to create the index object for normal vector tips');
            return -1;
        }

        this.a_Position = this.gl.getAttribLocation(this.gl.program, 'a_Position');
        if (this.a_Position < 0) {
            console.log('Failed to get the storage location of a_Position');
            return -1;
        }

        this.a_normal = this.gl.getAttribLocation(this.gl.program, 'a_normal');
        if (this.a_normal < 0) {
            console.log('Failed to get the storage location of a_normal');
            return -1;
        }
		
		this.a_transformMatrix = this.gl.getAttribLocation(this.gl.program, 'a_transformMatrix');
        if (this.a_transformMatrix < 0) {
            console.log('Failed to get the storage location of a_transformMatrix');
            return -1;
        }

        // Get the storage location of u_color
        this.u_color = this.gl.getUniformLocation(this.gl.program, 'u_color');
        if (!this.u_color) {
            console.log('Failed to get u_color variable');
            return;
        }

        // Get the storage location of u_pointSize
        this.u_pointSize = gl.getUniformLocation(this.gl.program, 'u_pointSize');
        if (!this.u_pointSize) {
            console.log('Failed to get u_pointSize variable');
            return;
        }
		
		// Get the storage location of u_useTransformMatrix
        this.u_useTransformMatrix = this.gl.getUniformLocation(this.gl.program, 'u_useTransformMatrix');
        if (!this.u_useTransformMatrix) {
            console.log('Failed to get u_useTransformMatrix variable');
            return;
        }

        // Get the storage location of u_drawPolygon
        this.u_drawPolygon = this.gl.getUniformLocation(this.gl.program, 'u_drawPolygon');
        if (!this.u_drawPolygon) {
            console.log('Failed to get u_drawPolygon variable');
            return;
        }

        // Get the storage location of u_LightColor
        this.u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
        if (!this.u_LightColor) {
            console.log('Failed to get u_LightColor variable');
            return;
        }

        // Get the storage location of u_LightPosition
        this.u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
        if (!this.u_LightPosition) {
            console.log('Failed to get u_LightPosition variable');
            return;
        }

        // Get the storage location of u_AmbientLight
        this.u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
        if (!this.u_AmbientLight) {
            console.log('Failed to get u_AmbientLight variable');
            return;
        }

        // Get the storage location of u_colorAmbient
        this.u_colorAmbient = gl.getUniformLocation(gl.program, 'u_colorAmbient');
        if (!this.u_colorAmbient) {
            console.log('Failed to get u_colorAmbient variable');
            return;
        }

        // Get the storage location of u_colorSpec
        this.u_colorSpec = gl.getUniformLocation(gl.program, 'u_colorSpec');
        if (!this.u_colorSpec) {
            console.log('Failed to get u_colorSpec variable');
            return;
        }

        // Get the storage location of u_shininess
        this.u_shininess = gl.getUniformLocation(gl.program, 'u_shininess');
        if (!this.u_shininess) {
            console.log('Failed to get u_shininess variable');
            return;
        }

        this.u_mvpMatrix = gl.getUniformLocation(gl.program, 'u_mvpMatrix');
        if (!this.u_mvpMatrix) {
            console.log('Failed to get the storage location of u_mvpMatrix');
            return;
        }

        this.gl.uniform3f(this.u_LightColor, 1.0, 1.0, 1.0);
        // Set the ambient light
        this.gl.uniform3f(this.u_AmbientLight, 0.2, 0.2, 0.2);
        // Set the material ambient color
        this.gl.uniform3f(this.u_colorAmbient, 0.1923, 0.1923, 0.1923);
        // Set the material specular color
        this.gl.uniform3f(this.u_colorSpec, 0.5083, 0.5083, 0.5083);
        // Set the material shininess
        this.gl.uniform1f(this.u_shininess, 51);

        this.viewport = viewport;

		this.lengthVector = 0.1;
        this.heighTip = 0.3 * this.lengthVector;
    },
    setDependentGeomParameters: function () {
        Camera.d0 = Math.sqrt(Math.pow(1.0 / 2.0, 2) +
           Math.pow(1.0 / 2.0, 2) +
           Math.pow(0.3, 2));

        this.resetCamera();
    },
    yt: function(x, t) {
        // https://en.wikipedia.org/wiki/NACA_airfoil
        return 5*t*(0.2969*Math.sqrt(x) - 0.1260*x - 0.3516*(x**2) + 0.2843*(x**3) - 0.1015*(x**4));
    },
    yt_x: function(x, t) {	
        //ВЕРНУТЬ ПРОИЗВОДНУЮ dyt/dx
    },
    c1: function (u, pt) {
        const t = 0.15;
        let x, y;
        if (u < 0.5) {
            x = 2*u;
            y = this.yt(x, t);
        }
        else {
            x = 2*(1-u);
            y = -this.yt(x, t);
        }

        pt.x = x - 0.5;
        pt.y = y;
        pt.z = 0.5;
    },
    c1_u: function (u, pt) {
        // //РАССЧИТАТЬ ПРОИЗВОДНУЮ dc1/du
		// if ((u == 0) || (Math.abs(u-1) < Number.EPSILON)) {
			// pt.x = 0;
			// pt.y = 1;
			// pt.z = 0;
		// }
		// else {
			// pt.x = x_u;
			// pt.y = y_u;
			// pt.z = 0;
		// }
    },
    c2: function (u, pt) {
        const t = 0.3;
        let x, y;
        if (u < 0.5) {
            x = 2*u;
            y = this.yt(x, t);
        }
        else {
            x = 2*(1-u);
            y = -this.yt(x, t);
        }

        pt.x = x - 0.5;
        pt.y = y;
        pt.z = -0.5;
    },
    c2_u: function (u, pt) {
        // //РАССЧИТАТЬ ПРОИЗВОДНУЮ dc2/du
		// if ((u == 0) || (Math.abs(u-1) < Number.EPSILON)) {
			// pt.x = 0;
			// pt.y = 1;
			// pt.z = 0;
		// }
		// else {
			// pt.x = x_u;
			// pt.y = y_u;
			// pt.z = 0;
		// }
    },
    generateBoundaryCurves: function (n) {

        this.verticesC1 = new Float32Array(3 * n);
        this.verticesC2 = new Float32Array(3 * n);

        const pt = new Point();

        this.setDependentGeomParameters();

        for (let i = 0; i < n; i++)
        {
            const t = i / (n - 1);

            this.c1(t, pt);
            this.verticesC1[i * 3]     = pt.x;
            this.verticesC1[i * 3 + 1] = pt.y;
            this.verticesC1[i * 3 + 2] = pt.z;

            this.c2(t, pt);
            this.verticesC2[i * 3] = pt.x;
            this.verticesC2[i * 3 + 1] = pt.y;
            this.verticesC2[i * 3 + 2] = pt.z;
        }

        this.FSIZE = this.verticesC1.BYTES_PER_ELEMENT;

        if (this.controlsParameters.ruledSurface)
            this.calculateRuledSurface();

        this.setVertexBuffersAndDraw();
    },
    resetCamera: function (resetAngles) {
    	if (resetAngles) {
        this.xRot = 0;
        this.yRot = 0;
      }
        this.wheelDelta = 0.0;
    },
    setLeftButtonDown: function(value){
        this.leftButtonDown = value;
    },
        setAxes: function () {
    		this.verticesAxes.set(Camera.getAxesPoints());
    },
    create_coord_tip: function (orient, height, n, m) {
        let r, phi, x, y, z;
        let i, j, k, p, q;
		let countParametersOneTip;
        let count;
        let verticesVectorTipCtr;

        let pt;

        const rTop = 0;
        const rBase = 0.25 * height;
        this.nLongitudes = 36;
        this.nLatitudes = 2;

        countParametersOneTip = this.nLatitudes * this.nLongitudes * this.countAttribData;
		
		count = n * m * countParametersOneTip;
		
		switch (orient) {
            case "normals":
                this.verticesNormalVectorTip = new Float32Array(count);
                verticesVectorTipCtr = this.verticesNormalVectorTip;
                break;
            case "axes":
                this.verticesAxesTip = new Float32Array(count);
                verticesVectorTipCtr = this.verticesAxesTip;
                break;
        }

        k = 0;
		for (p = 0; p < n; p++)
            for (q = 0; q < m; q++)
				for (i = 0; i < this.nLatitudes; i++)
					for (j = 0; j < this.nLongitudes; j++) {
						r = rBase + (rTop - rBase) / (this.nLatitudes - 1) * i;
						phi = 2 * Math.PI / this.nLongitudes * j;

						x = r * Math.cos(phi);
						y = r * Math.sin(phi);
						z = height / (this.nLatitudes - 1) * i - height;

						//console.log("p = ", p, "  q = ", q, "  i = ", i, "  j = ", j, "  x = ", x, "  y = ", y, "  z = ", z);

                        verticesVectorTipCtr[k++] = x;
                        verticesVectorTipCtr[k++] = y;
                        verticesVectorTipCtr[k++] = z;
                        verticesVectorTipCtr[k++] = 1.0;
                        verticesVectorTipCtr[k++] = 0.0;
                        verticesVectorTipCtr[k++] = 0.0;
                        verticesVectorTipCtr[k++] = 0.0;
                        verticesVectorTipCtr[k++] = 0.0;
                        verticesVectorTipCtr[k++] = 1.0;
                        verticesVectorTipCtr[k++] = 0.0;
                        verticesVectorTipCtr[k++] = 0.0;
                        verticesVectorTipCtr[k++] = 0.0;
                        verticesVectorTipCtr[k++] = 0.0;
                        verticesVectorTipCtr[k++] = 1.0;
                        verticesVectorTipCtr[k++] = 0.0;
                        verticesVectorTipCtr[k++] = 0.0;
                        verticesVectorTipCtr[k++] = 0.0;
                        verticesVectorTipCtr[k++] = 0.0;
                        verticesVectorTipCtr[k++] = 1.0;
            }
    },
    create_indexes_tip: function (orient, n, m) {
        let i, j, k, p, q;
        let countIndicesOneTip, countPointsOneTip, disp;
        let m_countTipIndices;
        let indicesVectorCtr;

        countIndicesOneTip = (this.nLatitudes - 1) * this.nLongitudes * 2 * 3;
		countPointsOneTip = this.nLatitudes * this.nLongitudes;
        m_countTipIndices = n * m * countIndicesOneTip;
        
		switch (orient) {
            case "normals":
                this.indicesNormalVectorTip = new Uint16Array(m_countTipIndices);
                indicesVectorCtr = this.indicesNormalVectorTip;
                break;
            case "axes":
                this.indicesAxesTip = new Uint16Array(m_countTipIndices);
                indicesVectorCtr = this.indicesAxesTip;
                break;
        }

        k = 0;

        for (p = 0; p < n; p++)
            for (q = 0; q < m; q++) {
                disp = (p * m + q) * countPointsOneTip;
				for (i = 0; i < this.nLatitudes - 1; i++)
					for (j = 0; j < this.nLongitudes; j++) {
						if (j != this.nLongitudes - 1) {
							indicesVectorCtr[k++] = disp + this.nLongitudes * i + j;
							indicesVectorCtr[k++] = disp + this.nLongitudes * i + j + 1;
							indicesVectorCtr[k++] = disp + this.nLongitudes * (i + 1) + j + 1;

							indicesVectorCtr[k++] = disp + this.nLongitudes * (i + 1) + j + 1;
							indicesVectorCtr[k++] = disp + this.nLongitudes * (i + 1) + j;
							indicesVectorCtr[k++] = disp + this.nLongitudes * i + j;
						}
						else {
							indicesVectorCtr[k++] = disp + this.nLongitudes * i + j;
							indicesVectorCtr[k++] = disp + this.nLongitudes * i;
							indicesVectorCtr[k++] = disp + this.nLongitudes * (i + 1);

							indicesVectorCtr[k++] = disp + this.nLongitudes * (i + 1);
							indicesVectorCtr[k++] = disp + this.nLongitudes * (i + 1) + j;
							indicesVectorCtr[k++] = disp + this.nLongitudes * i + j;
						}
					}
			}
    },
	setVector: function (x1, y1, z1, x2, y2, z2, i, j) {
        let pt;
        let ptm;

        let verticesVectorTip;

        const number = i * this.controlsParameters.M + j;
		
		verticesVectorTip = this.verticesNormalVectorTip;

        const vec = vec3.normalize(vec3.create(), vec3.fromValues(x2 - x1, y2 - y1, z2 - z1));
        const q = quat.rotationTo(quat.create(), [0.0, 0.0, 1.0], vec);
        const rotateMatrix = mat4.fromQuat(mat4.create(), q);

        const translateMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(x2, y2, z2));

        const transformMatrix = mat4.mul(mat4.create(), translateMatrix, rotateMatrix);

        this.setTransformMatrix(verticesVectorTip, transformMatrix, number);
    },
	setTransformMatrix: function (verticesVectorTip, transformMatrix, i) {
        const countParametersOneTip = this.nLatitudes * this.nLongitudes * this.countAttribData;
        const disp = i * countParametersOneTip;

        for (let j = 0; j < this.nLatitudes; j++)
            for (let k = 0; k < this.nLongitudes; k++)
                for (let l = 0; l < 16; l++) {
                    verticesVectorTip[disp + (j * this.nLongitudes + k) * this.countAttribData + 3 + l] = transformMatrix[l];
                }
    },
    createIndicesSurfaceLines: function (n, m) {
        let i, j, k = 0;
        this.indicesSurfaceLines = new Uint16Array(2 * n * m);
        this.ISIZE = this.indicesSurfaceLines.BYTES_PER_ELEMENT;

        for (i = 0; i < n; i++) {
            for (j = 0; j < m; j++)
                this.indicesSurfaceLines[k++] = i * m + j;
        }
        for (j = 0; j < m; j++) {
            for (i = 0; i < n; i++)
                this.indicesSurfaceLines[k++] = i * m + j;
        }
    },
    createIndicesSurfaceTriangles: function (n, m) {
        let k = 0;
        this.indicesSurfaceTriangles = new Uint16Array(6 * (n-1) * (m-1));

        for (let i = 0; i < n-1; i++)
            for (let j = 0; j < m-1; j++) {
                this.indicesSurfaceTriangles[k++] = i * m + j;
                this.indicesSurfaceTriangles[k++] = (i+1) * m + j;
                this.indicesSurfaceTriangles[k++] = i * m + j+1;
                this.indicesSurfaceTriangles[k++] = i * m + j+1;
                this.indicesSurfaceTriangles[k++] = (i + 1) * m + j;
                this.indicesSurfaceTriangles[k++] = (i + 1) * m + j+1;
            }
    },
    setXRotation: function (angle) {
        const lAngle = Camera.normalizeAngle(angle);
        if (lAngle != this.xRot) {
            this.xRot = lAngle;
        }
    },
    setYRotation: function (angle) {
        const lAngle = Camera.normalizeAngle(angle);
        if (lAngle != this.yRot) {
            this.yRot = lAngle;
        }
    },
    mousemoveHandler: function (x, y) {
        if (this.leftButtonDown) {
            const dx = x - this.lastPosX;
            const dy = y - this.lastPosY;

            this.setXRotation(this.xRot - 8 * dx);
            this.setYRotation(this.yRot - 8 * dy);

            this.lastPosX = x;
            this.lastPosY = y;

            this.setVertexBuffersAndDraw();
        }
    },
    mousedownHandler: function (button, x, y) {
        switch (button) {
            case 0: //left button
                this.lastPosX = x;
                this.lastPosY = y;

                this.setLeftButtonDown(true);
                break;
            case 2: //right button
                this.resetCamera(true);
                this.setVertexBuffersAndDraw();
                break;
        }
    },
    mouseupHandler: function (button, x, y) {
        if (button == 0) //left button
            this.setLeftButtonDown(false);
    },
    mousewheel: function (delta) {
        const d = Camera.d0 * (-1.) * delta / 1000.0;
        if ((this.wheelDelta + d >= -Camera.d0) && (this.wheelDelta + d <= Camera.d0*3.0))
            this.wheelDelta += d;

        this.setVertexBuffersAndDraw();
    },
    setVertexBuffersAndDraw: function () {
        let i, j;
        let q, rotateMatrix, translateMatrix, transformMatrix, axesTransformMatrix;
        
        this.cam = Camera.getLookAt(this.wheelDelta, this.xRot, this.yRot);
        this.proj = Camera.getProjMatrix();

        // this.gl.uniform4f(this.u_LightPosition, 0.0, 1.0, 0.0, 1.0);
        this.gl.uniform4f(this.u_LightPosition, Camera.eye[0], Camera.eye[1], Camera.eye[2], 1.0);

        this.gl.uniform1f(this.u_useTransformMatrix, false);
        this.gl.uniform1f(this.u_drawPolygon, false);

        // Clear <canvas>
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        this.setAxes();
        this.create_coord_tip("axes", Camera.getAxesTipLength(), 1, 1);
        this.create_indexes_tip("axes", 1, 1);
        
        // Bind the buffer object to target
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferAxes);
        // Write date into the buffer object
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesAxes, this.gl.DYNAMIC_DRAW);
        // Assign the buffer object to a_Position variable
        this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);
        // Enable the assignment to a_Position variable
        this.gl.enableVertexAttribArray(this.a_Position);
        // Disable the assignment to a_normal variable
        this.gl.disableVertexAttribArray(this.a_normal);
		this.gl.disableVertexAttribArray(this.a_transformMatrix);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 1);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 2);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 3);
        
        const axes_scale = 0.1;
        const half_axes_scale_length = 1.5 * (this.verticesAxes[17] - this.verticesAxes[14]) * axes_scale / 2;
        const scaleMatrix = mat4.fromScaling(mat4.create(), [axes_scale, axes_scale, axes_scale]);
        translateMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(this.verticesAxes[3] - half_axes_scale_length, //x_max - half_axes_scale_length
        																																			-this.verticesAxes[10] + half_axes_scale_length, //-y_max + half_axes_scale_length 
        																																			this.verticesAxes[17] - half_axes_scale_length)); //z_max - half_axes_scale_length 
		    transformMatrix = mat4.mul(mat4.create(), scaleMatrix, this.world);
		    transformMatrix = mat4.mul(mat4.create(), this.cam, transformMatrix);
		    transformMatrix = mat4.mul(mat4.create(), translateMatrix, transformMatrix);
		    transformMatrix = mat4.mul(mat4.create(), this.proj, transformMatrix);
		    this.gl.uniformMatrix4fv(this.u_mvpMatrix, false, transformMatrix);
        
        // Draw
        this.gl.uniform4f(this.u_color, 1.0, 0.0, 0.0, 1.0);
        this.gl.drawArrays(this.gl.LINES, 0, 2);
        this.gl.uniform4f(this.u_color, 0.0, 1.0, 0.0, 1.0);
        this.gl.drawArrays(this.gl.LINES, 2, 2);
        this.gl.uniform4f(this.u_color, 0.0, 0.0, 1.0, 1.0);
        this.gl.drawArrays(this.gl.LINES, 4, 2);
        
        const countTipIndices = (this.nLatitudes - 1) * this.nLongitudes * 2 * 3;
        // Bind the buffer object to target
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferAxesTip);
        // Write date into the buffer object
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesAxesTip, this.gl.DYNAMIC_DRAW);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBufferAxesTip);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indicesAxesTip, this.gl.DYNAMIC_DRAW);
        // Assign the buffer object to a_Position variable
        this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, 0);
        // Enable the assignment to a_Position variable
        this.gl.enableVertexAttribArray(this.a_Position);
        // Disable the assignment to a_normal variable
        this.gl.disableVertexAttribArray(this.a_normal);
		this.gl.disableVertexAttribArray(this.a_transformMatrix);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 1);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 2);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 3);
        this.gl.uniform4f(this.u_color, 0.0, 0.0, 0.0, 1.0);

		for (i=0; i<3; i++) {
			switch (i) {
			case 0:
				q = quat.rotationTo(quat.create(), [0.0, 0.0, 1.0], [1.0, 0.0, 0.0]);
				translateMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(this.verticesAxes[3], this.verticesAxes[4], this.verticesAxes[5])); //x_max
				break;
			case 1:
				q = quat.rotationTo(quat.create(), [0.0, 0.0, 1.0], [0.0, 1.0, 0.0]);
				translateMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(this.verticesAxes[9], this.verticesAxes[10], this.verticesAxes[11])); //y_max
				break;
			case 2:
				q = quat.rotationTo(quat.create(), [0.0, 0.0, 1.0], [0.0, 0.0, 1.0]);
				translateMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(this.verticesAxes[15], this.verticesAxes[16], this.verticesAxes[17])); //z_max
				break;
			}
			rotateMatrix = mat4.fromQuat(mat4.create(), q);
			axesTransformMatrix = mat4.mul(mat4.create(), translateMatrix, rotateMatrix);
			axesTransformMatrix = mat4.mul(mat4.create(), transformMatrix, axesTransformMatrix);
			this.gl.uniformMatrix4fv(this.u_mvpMatrix, false, axesTransformMatrix);
			this.gl.drawElements(this.gl.TRIANGLES, countTipIndices, this.gl.UNSIGNED_SHORT, 0);
            
        }
		
		const N = this.controlsParameters.N;
		const M = this.controlsParameters.M;
        
        const mvMatr = mat4.mul(mat4.create(), this.cam, this.world);
        const mvpMatr = mat4.mul(mat4.create(), this.proj, mvMatr);
        
        this.gl.uniformMatrix4fv(this.u_mvpMatrix, false, mvpMatr);
        
        // Bind the buffer object to target
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferC1);
        // Write date into the buffer object
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesC1, this.gl.STATIC_DRAW);
        // Assign the buffer object to a_Position variable
        this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);
        // Enable the assignment to a_Position variable
        this.gl.enableVertexAttribArray(this.a_Position);
        // Disable the assignment to a_normal variable
        this.gl.disableVertexAttribArray(this.a_normal);
		// Disable the assignment to a_transformMatrix variable
        this.gl.disableVertexAttribArray(this.a_transformMatrix);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 1);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 2);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 3);

        this.gl.uniform4f(this.u_color, 0.0, 0.0, 0.0, 1.0);
        this.gl.uniform1f(this.u_pointSize, 3.0);

        // Draw
        this.gl.drawArrays(this.gl.LINE_STRIP, 0, N);

        // Bind the buffer object to target
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferC2);
        // Write date into the buffer object
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesC2, this.gl.STATIC_DRAW);
        // Assign the buffer object to a_Position variable
        this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);
        // Enable the assignment to a_Position variable
        this.gl.enableVertexAttribArray(this.a_Position);
        // Disable the assignment to a_normal variable
        this.gl.disableVertexAttribArray(this.a_normal);
		// Disable the assignment to a_transformMatrix variable
        this.gl.disableVertexAttribArray(this.a_transformMatrix);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 1);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 2);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 3);

        this.gl.drawArrays(this.gl.LINE_STRIP, 0, N);

        if (this.controlsParameters.ruledSurface)
        {
            this.gl.uniform1f(this.u_useTransformMatrix, false);
            // Bind the buffer object to target
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferSurface);
            // Write date into the buffer object
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesSurface, this.gl.DYNAMIC_DRAW);
            //var FSIZE = this.verticesSurface.BYTES_PER_ELEMENT;
            // Assign the buffer object to a_Position variable
            this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, this.FSIZE * 6, 0);
            // Assign the buffer object to a_normal variable
            this.gl.vertexAttribPointer(this.a_normal, 3, this.gl.FLOAT, false, this.FSIZE * 6, this.FSIZE * 3);
            // Enable the assignment to a_Position variable
            this.gl.enableVertexAttribArray(this.a_Position);
            // Enable the assignment to a_normal variable
            this.gl.enableVertexAttribArray(this.a_normal);
			// Disable the assignment to a_transformMatrix variable
            this.gl.disableVertexAttribArray(this.a_transformMatrix);
            this.gl.disableVertexAttribArray(this.a_transformMatrix + 1);
            this.gl.disableVertexAttribArray(this.a_transformMatrix + 2);
            this.gl.disableVertexAttribArray(this.a_transformMatrix + 3);

            this.gl.uniform4f(this.u_color, 1.0, 0.0, 0.0, 1.0);
            this.gl.uniform1f(this.u_pointSize, 5.0);
            //points
			switch (this.controlsParameters.visualize) {
            case "points":
                this.gl.drawArrays(this.gl.POINTS, 0, N * M);
				break;
			case "lines":
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBufferSurfaceLines);
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indicesSurfaceLines, this.gl.DYNAMIC_DRAW);

                this.gl.uniform4f(this.u_color, 0.0, 1.0, 1.0, 1.0);

                for (i = 0; i < N; i++)
                    this.gl.drawElements(this.gl.LINE_STRIP, M, this.gl.UNSIGNED_SHORT, ((i * M) * this.ISIZE));

                this.gl.uniform4f(this.u_color, 1.0, 0.0, 1.0, 1.0);

                for (j = 0; j < M; j++)
                    this.gl.drawElements(this.gl.LINE_STRIP, N, this.gl.UNSIGNED_SHORT, ((N * M + j * N) * this.ISIZE));
				break;
			case "surface":
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBufferSurfaceTriangles);
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indicesSurfaceTriangles, this.gl.DYNAMIC_DRAW);

                this.gl.uniform1f(this.u_drawPolygon, true);
                // this.gl.depthMask(false);
                // this.gl.enable(this.gl.BLEND);
                // this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
                this.gl.uniform4f(this.u_color, 0.5075, 0.5075, 0.5075, 1.0);
                this.gl.drawElements(this.gl.TRIANGLES, 6 * (N - 1) * (M - 1), this.gl.UNSIGNED_SHORT, 0);
                // this.gl.disable(this.gl.BLEND);
                // this.gl.depthMask(true);
				break;
            }
			
			if (this.controlsParameters.showNormals) {
				// Bind the buffer object to target
				this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferNormalVector);
				// Write date into the buffer object
				this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesNormalVector, this.gl.DYNAMIC_DRAW);
				this.gl.uniform4f(this.u_color, 0.0, 0.0, 0.0, 1.0);
				// Assign the buffer object to a_Position variable
				this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);
				// Enable the assignment to a_Position variable
				this.gl.enableVertexAttribArray(this.a_Position);
				// Disable the assignment to a_normal variable
				this.gl.disableVertexAttribArray(this.a_normal);
				// Disable the assignment to a_transformMatrix variable
				this.gl.disableVertexAttribArray(this.a_transformMatrix);
				this.gl.disableVertexAttribArray(this.a_transformMatrix + 1);
				this.gl.disableVertexAttribArray(this.a_transformMatrix + 2);
				this.gl.disableVertexAttribArray(this.a_transformMatrix + 3);
				this.gl.drawArrays(this.gl.LINES, 0, 2 * N * M);
			
				this.gl.uniform1f(this.u_useTransformMatrix, true);
				const countIndicesOneTip = (this.nLatitudes - 1) * this.nLongitudes * 2 * 3;

				// Bind the buffer object to target
				this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferNormalVectorTip);
				// Write date into the buffer object
				this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesNormalVectorTip, this.gl.DYNAMIC_DRAW);
				this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBufferNormalVectorTip);
				this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indicesNormalVectorTip, this.gl.DYNAMIC_DRAW);

				// Assign the buffer object to a_Position variable
				this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, 0);
				// Enable the assignment to a_Position variable
				this.gl.enableVertexAttribArray(this.a_Position);
				// Disable the assignment to a_normal variable
				this.gl.disableVertexAttribArray(this.a_normal);
				// Assign the buffer object to a_transformMatrix variable
				this.gl.vertexAttribPointer(this.a_transformMatrix, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * 3);
				this.gl.vertexAttribPointer(this.a_transformMatrix + 1, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (4 + 3));
				this.gl.vertexAttribPointer(this.a_transformMatrix + 2, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (8 + 3));
				this.gl.vertexAttribPointer(this.a_transformMatrix + 3, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (12 + 3));
				// Enable the assignment to a_transformMatrix variable
				this.gl.enableVertexAttribArray(this.a_transformMatrix);
				this.gl.enableVertexAttribArray(this.a_transformMatrix + 1);
				this.gl.enableVertexAttribArray(this.a_transformMatrix + 2);
				this.gl.enableVertexAttribArray(this.a_transformMatrix + 3);

				this.gl.uniform4f(this.u_color, 0.0, 0.0, 0.0, 1.0);

				this.gl.drawElements(this.gl.TRIANGLES, N * M * countIndicesOneTip, this.gl.UNSIGNED_SHORT, 0);
			}
        }
    },
		calculateAndDraw: function () {
		if (this.controlsParameters.ruledSurface)
			this.calculateRuledSurface();
        
        this.setVertexBuffersAndDraw();
    },
    calculateRuledSurface: function(){

        let i, j;
        let u, v;

        const N = this.controlsParameters.N;
        const M = this.controlsParameters.M;

        this.pointsSurface = new Array(N);
        this.normalsSurface = new Array(N);
        for (i = 0; i < N; i++) {
            this.pointsSurface[i] = new Array(M);
            this.normalsSurface[i] = new Array(M);
            for (j = 0; j < M; j++)
                this.normalsSurface[i][j] = new Array(3);
        }

        const pt1 = new Point();
        const pt2 = new Point();
		
		const pt1_u = new Point();
        const pt2_u = new Point();
		
		u = 0;

        //// ДОБАВИТЬ КОД РАСЧЕТА ТОЧЕК ЛИНЕЙЧАТОЙ ПОВЕРХНОСТИ
        //for (i = 0; i < N; i++) {
        //    for (j = 0; j < M; j++) {
        //        this.c1(u, pt1);
        //        this.c2(u, pt2);

        //        const x = ;
        //        const y = ;
        //        const z = ;

        //        pt = new Point(x, y, z);
        //        this.pointsSurface[i][j] = pt;

        //        //calculate tangent vectors
        //        this.c1_u(u, pt1_u);
        //        this.c2_u(u, pt2_u);
        
        //        const x_u = ;
        //        const y_u = ;
        //        const z_u = ;
                  
        //        const x_v = ;
        //        const y_v = ;
        //        const z_v = ;
                  
        //        const pt_u = vec3.fromValues(x_u, y_u, z_u);
        //        const pt_v = vec3.fromValues(x_v, y_v, z_v);
                  
        //        //CALCULATE NORMAL VECTOR
        //        const normal = vec3.create();
                  
				// let k = 0.07;
                // this.normalsSurface[i][j][0] = k * normal[0];
                // this.normalsSurface[i][j][1] = k * normal[1];
                // this.normalsSurface[i][j][2] = k * normal[2];
        //    }
        //}

		this.create_coord_tip("normals", this.heighTip, N, M);
        this.create_indexes_tip("normals", N, M);
        this.verticesSurface = new Float32Array(N * M * 6);
        this.verticesNormalVector = new Float32Array(N * M * 6);
        for (i = 0; i < N; i++)
            for (j = 0; j < M; j++) {
                const offset = i * M + j;
                this.verticesSurface[offset * 6] = this.pointsSurface[i][j].x;
                this.verticesSurface[offset * 6 + 1] = this.pointsSurface[i][j].y;
                this.verticesSurface[offset * 6 + 2] = this.pointsSurface[i][j].z;
                this.verticesSurface[offset * 6 + 3] = this.normalsSurface[i][j][0];
                this.verticesSurface[offset * 6 + 4] = this.normalsSurface[i][j][1];
                this.verticesSurface[offset * 6 + 5] = this.normalsSurface[i][j][2];
				
				this.verticesNormalVector[2 * offset * 3    ] = this.pointsSurface[i][j].x;
				this.verticesNormalVector[2 * offset * 3 + 1] = this.pointsSurface[i][j].y;
				this.verticesNormalVector[2 * offset * 3 + 2] = this.pointsSurface[i][j].z;
				this.verticesNormalVector[(2 * offset + 1) * 3    ] = this.pointsSurface[i][j].x + this.normalsSurface[i][j][0];
				this.verticesNormalVector[(2 * offset + 1) * 3 + 1] = this.pointsSurface[i][j].y + this.normalsSurface[i][j][1];
				this.verticesNormalVector[(2 * offset + 1) * 3 + 2] = this.pointsSurface[i][j].z + this.normalsSurface[i][j][2];
				
				this.setVector(this.verticesNormalVector[2 * offset * 3    ], this.verticesNormalVector[2 * offset * 3 + 1],       this.verticesNormalVector[2 * offset * 3 + 2],
                         this.verticesNormalVector[(2 * offset + 1) * 3    ], this.verticesNormalVector[(2 * offset + 1) * 3 + 1], this.verticesNormalVector[(2 * offset + 1) * 3 + 2],
                         i, j);
            }

        this.createIndicesSurfaceLines(N, M);
        this.createIndicesSurfaceTriangles(N, M);
    }
}

function mousedown(ev, canvas) {
    event = EventUtil.getEvent(event);

    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.mousedownHandler(EventUtil.getButton(ev), x - rect.left, canvas.height - (y - rect.top));
}

function mouseup(ev, canvas) {
    event = EventUtil.getEvent(event);

    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.mouseupHandler(EventUtil.getButton(ev), x - rect.left, canvas.height - (y - rect.top));
}

function mousemove(ev, canvas)
{
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.mousemoveHandler(x - rect.left, canvas.height - (y - rect.top));
}

window.onload = main;
