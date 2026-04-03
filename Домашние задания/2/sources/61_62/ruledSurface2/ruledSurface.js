// 2.js

"use strict";

// Vertex shader program
const VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute float a_select;\n' +
    'attribute vec4 a_normal;\n' +
    'attribute mat4 a_transformMatrix;\n' +
    'uniform mat4 u_mvpMatrix;\n' +
    'uniform bool u_useTransformMatrix;\n' +
    'uniform float u_pointSize;\n' +
    'uniform float u_pointSizeSelect;\n' +
    'uniform vec4 u_color;\n' +
    'uniform vec4 u_colorSelect;\n' +
    'varying vec4 v_color;\n' +
    'varying vec4 v_normal;\n' +
    'varying vec4 v_position;\n' +
    'void main() {\n' +
    '  if (u_useTransformMatrix)\n' +
    '    gl_Position = u_mvpMatrix * a_transformMatrix * a_Position;\n' +
    '  else\n' +
    '    gl_Position = u_mvpMatrix * a_Position;\n' +
    '  if (a_select != 0.0)\n' +
    '  {\n' +
    '    v_color = u_colorSelect;\n' +
    '    gl_PointSize = u_pointSizeSelect;\n' +
    '  }\n' +
    '  else\n' +
    '  {\n' +
    '    v_color = u_color;\n' +
    '    gl_PointSize = u_pointSize;\n' +
    '  }\n' +
    '  v_normal = a_normal;\n' +
    '  v_position = a_Position;\n' +
    '}\n';

// Fragment shader program
const FSHADER_SOURCE =
    'precision mediump float;\n' +
    'varying vec4 v_color;\n' +
    'varying vec4 v_normal;\n' +
    'varying vec4 v_position;\n' +
    'uniform bool u_drawPolygon;\n' +
    'uniform vec3 u_LightColor;\n' +     // Light color
    'uniform vec4 u_LightPosition;\n' + // Position of the light source (in the world coordinate system)
    'uniform vec3 u_AmbientLight;\n' +   // Color of an ambient light
    'uniform vec3 u_colorAmbient;\n' +
    'uniform vec3 u_colorSpec;\n' +
    'uniform float u_shininess;\n' +
    'void main() {\n' +
    '  if (u_drawPolygon) {\n' +
    // Make the length of the normal 1.0
    '    vec3 normal =  normalize(gl_FrontFacing ? v_normal.xyz : -v_normal.xyz);\n' +
    // Calculate the light direction and make it 1.0 in length
    '    vec3 lightDirection = normalize(vec3(u_LightPosition - v_position));\n' +
    // Dot product of the light direction and the orientation of a surface (the normal)
    '    float nDotL = max(dot(lightDirection, normal), 0.0);\n' +
    // Calculate the color due to diffuse reflection
    '    vec3 diffuse = u_LightColor * v_color.rgb * nDotL;\n' +
    // Calculate the color due to ambient reflection
    '    vec3 ambient = u_AmbientLight * u_colorAmbient;\n' +
    '    vec3 r = reflect( -lightDirection, normal );\n' +
    '    vec3 spec = vec3(0.0);\n' +
    '    if( nDotL > 0.0 )\n' +
    '      spec = u_LightColor * u_colorSpec *\n' +
    '             pow( max( dot(r,lightDirection), 0.0 ), u_shininess );\n' +
    '    \n' +
    // Add the surface colors due to diffuse reflection and ambient reflection
    '    gl_FragColor = vec4(spec + diffuse + ambient, v_color.a);\n' +
    '  } else {\n' +
    '    gl_FragColor = v_color;\n' +
    '  }\n' +
    '}\n';
	
const {mat2, mat3, mat4, vec2, vec3, vec4, quat} = glMatrix;

function main() {
    // Retrieve <canvas> element
    const canvas = document.getElementById('webgl');
	canvas.width  = document.documentElement.clientWidth;
	canvas.height = document.documentElement.clientHeight;

    // Get the rendering context for WebGL
    const gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    const viewport = [0, 0, canvas.width, canvas.height];
    gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
	
	const gui = new dat.GUI();
	
	const guiCtrPointsParams = gui.addFolder('Control point parameters');
	const guiAreaBounds = guiCtrPointsParams.addFolder('Area Bounds');
	const guiCountControlPoints = guiCtrPointsParams.addFolder('Count control points');
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
	
	guiAreaBounds.add(Data.controlsParameters, 'Xmin', 0, 3 * Math.PI).onChange(function (e) { Data.setDependentGeomParameters(); Data.generateControlPoints(); });
	guiAreaBounds.add(Data.controlsParameters, 'Xmax', 0, 3 * Math.PI).onChange(function (e) { Data.setDependentGeomParameters(); Data.generateControlPoints(); });
	guiAreaBounds.add(Data.controlsParameters, 'Ymin', 0, 3 * Math.PI).onChange(function (e) { Data.setDependentGeomParameters(); Data.generateControlPoints(); });
	guiAreaBounds.add(Data.controlsParameters, 'Ymax', 0, 3 * Math.PI).onChange(function (e) { Data.setDependentGeomParameters(); Data.generateControlPoints(); });
	guiAreaBounds.add(Data.controlsParameters, 'Z', 0, 5).onChange(function (e) { Data.setDependentGeomParameters(); Data.generateControlPoints(); });
	guiCountControlPoints.add(Data.controlsParameters, 'N_ctr', 2, 8, 1).onChange(function (e) { Data.generateControlPoints(); });
	guiCtrPointsParams.add(Data.controlsParameters, 'showCtrPoints').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	guiCtrPointsParams.add(Data.controlsParameters, 'controlPolygons').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	
	guiSurfaceParams.add(Data.controlsParameters, 'ruledSurface').onChange(function (e) { Data.calculateAndDraw(); });
	guiCountSurfacePoints.add(Data.controlsParameters, 'N', 2, 200, 1).onChange(function (e) { Data.calculateAndDraw(); });
	guiCountSurfacePoints.add(Data.controlsParameters, 'M', 2, 10, 1).onChange(function (e) { Data.calculateAndDraw(); });
	guiSurfaceParams.add(Data.controlsParameters, 'paramCoords', ["uniform", "chordal", "centripetal"]).onChange(function (e) { Data.calculateAndDraw(); });
	guiSurfaceParams.add(Data.controlsParameters, 'visualize', ["points", "lines", "surface"]).onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	guiSurfaceParams.add(Data.controlsParameters, 'showNormals').onChange(function (e) { Data.setVertexBuffersAndDraw(); });

    // gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.DEPTH_TEST);

    // Specify the color for clearing <canvas>
    gl.clearColor(0.8, 0.8, 0.8, 1.0);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    Data.generateControlPoints();
}

function project(obj, mvpMatrix, viewport) {
    const win = vec4.transformMat4(vec4.create(), obj, mvpMatrix);

    if (win[3] == 0.0)
        return;

    win[0] /= win[3];
    win[1] /= win[3];
    win[2] /= win[3];

    win[0] = win[0] * 0.5 + 0.5;
    win[1] = win[1] * 0.5 + 0.5;
    win[2] = win[2] * 0.5 + 0.5;

    win[0] = viewport[0] + win[0] * viewport[2];
    win[1] = viewport[1] + win[1] * viewport[3];

    return win;
}

function unproject(win, modelView, projection, viewport) {

    const invertMV = mat4.invert(mat4.create(), modelView);
    const invertP = mat4.invert(mat4.create(), projection);

    const invertMVP = mat4.multiply(mat4.create(), invertMV, invertP);

    win[0] = (win[0] - viewport[0]) / viewport[2];
    win[1] = (win[1] - viewport[1]) / viewport[3];

    win[0] = win[0] * 2 - 1;
    win[1] = win[1] * 2 - 1;
    win[2] = win[2] * 2 - 1;

    const obj = vec4.transformMat4(vec4.create(), win, invertMVP);

    if (obj[3] == 0.0)
        return;

    obj[0] /= obj[3];
    obj[1] /= obj[3];
    obj[2] /= obj[3];

    return obj;
}

class Point {
    constructor(x, y, z) {
        this.select = false;
        // ДОБАВИТЬ ПАРАМЕТРИЧЕСКУЮ КООРДИНАТУ u
        this.x = x;
        this.y = y;
        this.z = z;
        this.transformMatrix = mat4.create();
        this.winx = 0.0;
        this.winz = 0.0;
        this.winy = 0.0;
    }
	setPoint(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.setRect();
    }
    setRect() {
        this.left = this.winx - 10;
        this.right = this.winx + 10;
        this.bottom = this.winy - 10;
        this.up = this.winy + 10;
    }
    calculateWindowCoordinates(mvpMatrix, viewport) {
        const worldCoord = vec4.fromValues(this.x, this.y, this.z, 1.0);

        //------------Get window coordinates of point-----------
        const winCoord = project(worldCoord, mvpMatrix, viewport);
        winCoord[1] = (winCoord[1]); // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

        this.winx = winCoord[0];
        this.winy = winCoord[1];
        this.winz = winCoord[2];

        this.setRect();//create a bounding rectangle around point
    }
    ptInRect(x, y) {
        const inX = this.left <= x && x <= this.right;
        const inY = this.bottom <= y && y <= this.up;
        return inX && inY;
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
	initValues: function () {
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
        const transform_y = glMatrix.glMatrix.toRadian(y / 16.0);
        const transform_x = glMatrix.glMatrix.toRadian(x / 16.0);
		this.initValues();
		this.rotateVertical(transform_y);
		this.rotateHorizontal(transform_x);

        return mat4.lookAt(mat4.create(), 
            this.eye, 
            this.ref, 
            this.up);
    },
    getProjMatrix: function () {
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
    pointsCtr: [],
	m10PointsCtr: [],
	m10Ctr: [],
	pointsVector10Ctr: [],
    indicesCtr: [],
    indicesAxesTip: [],
	indicesVector10TipCtr: [],
    pointsSurface: [],
    indicesSurfaceLines: [],
    indicesSurfaceTriangles: [],
    indicesNormalVectorTip: [],
    normalsSurface: [],
    countAttribData: 3 + 1 + 16, //x,y,z,sel
    verticesAxes: {},
    verticesCtr: {},
	verticesVector10Ctr: {},
	verticesVector10TipCtr: {},
    verticesSurface: {},
    verticesNormalVector: {},
	verticesNormalVectorTip: {},
    FSIZE: 0,
    ISIZE: 0,
    gl: null,
    vertexBufferAxes: null,
    vertexBufferAxesTip: null,
    indexBufferAxesTip: null,
    vertexBufferCtr: null,
	vertexBufferVector10Ctr: null,
	vertexBufferVector10TipCtr: null,
    indexBufferCtr: null,
    vertexBufferSurface: null,
	indexBufferVector10TipCtr: null,
    indexBufferSurfaceLines: null,
    indexBufferSurfaceTriangles: null,
	vertexBufferNormalVector: null,
	vertexBufferNormalVectorTip: null,
    indexBufferNormalVectorTip: null,
    verticesAxesTip: {},
    a_Position: -1,
    a_select: -1,
    a_normal: -1,
    a_transformMatrix: -1,
    u_color: null,
    u_colorSelect: null,
    u_pointSize: null,
    u_pointSizeSelect: null,
    u_drawPolygon: false,
    u_useTransformMatrix: false,
    u_mvpMatrix: null,
    u_LightColor: null,
    u_LightPosition: null,
    u_AmbientLight: null,
    u_colorAmbient: null,
    u_colorSpec: null,
    u_shininess: null,
    movePoint: false,
	moveVector10: false,
    iMove: -1,
    jMove: -1,
	OldPt: null,
    OldPtm10: null,
	tPt: null,
    leftButtonDown: false,
    Xmid: 0.0,
    Ymid: 0.0,
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
		Xmin: 0.0,
		Xmax: 3 * Math.PI,
		Ymin: 0.0,
		Ymax: 3 * Math.PI,
		Z: 1.5,
		N_ctr: 4, 
		showCtrPoints: true,
        controlPolygons: false,
		ruledSurface: false,
		paramCoords: "uniform",
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
        
        this.vertexBufferCtr = this.gl.createBuffer();
        if (!this.vertexBufferCtr) {
            console.log('Failed to create the buffer object for control points');
            return -1;
        }
		
		this.vertexBufferVector10Ctr = this.gl.createBuffer();
		if (!this.vertexBufferVector10Ctr) {
			console.log('Failed to create the buffer object for vector 10');
			return -1;
		}
		
		this.vertexBufferVector10TipCtr = this.gl.createBuffer();
		if (!this.vertexBufferVector10TipCtr) {
			console.log('Failed to create the buffer object for vector 10 tips');
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

        this.indexBufferCtr = this.gl.createBuffer();
        if (!this.indexBufferCtr) {
            console.log('Failed to create the index object for control points');
            return -1;
        }
		
		this.indexBufferVector10TipCtr = this.gl.createBuffer();
		if (!this.indexBufferVector10TipCtr) {
			console.log('Failed to create the index object for vector 10 tips');
			return -1;
		}

        this.indexBufferSurfaceLines = this.gl.createBuffer();
        if (!this.indexBufferSurfaceLines) {
            console.log('Failed to create the index object for surface lines');
            return -1;
        }

        this.indexBufferSurfaceTriangles = this.gl.createBuffer();
        if (!this.indexBufferSurfaceTriangles) {
            console.log('Failed to create the index object for surface surface');
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

        this.a_select = this.gl.getAttribLocation(this.gl.program, 'a_select');
        if (this.a_select < 0) {
            console.log('Failed to get the storage location of a_select');
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

        // Get the storage location of u_colorSelect
        this.u_colorSelect = gl.getUniformLocation(this.gl.program, 'u_colorSelect');
        if (!this.u_colorSelect) {
            console.log('Failed to get u_colorSelect variable');
            return;
        }

        // Get the storage location of u_pointSize
        this.u_pointSize = gl.getUniformLocation(this.gl.program, 'u_pointSize');
        if (!this.u_pointSize) {
            console.log('Failed to get u_pointSize variable');
            return;
        }

        // Get the storage location of u_pointSize
        this.u_pointSizeSelect = gl.getUniformLocation(this.gl.program, 'u_pointSizeSelect');
        if (!this.u_pointSizeSelect) {
            console.log('Failed to get u_pointSizeSelect variable');
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
		
		this.lengthVector = 1.5;
        this.heighTip = 0.4 * this.lengthVector;

        this.setDependentGeomParameters();
		
		this.OldPt = new Point(0, 0);
		this.OldPtm10 = new Point(0, 0);
		this.tPt = new Point(0, 0);
    },
    setDependentGeomParameters: function () {
		const Xmin = this.controlsParameters.Xmin,
			  Xmax = this.controlsParameters.Xmax, 
			  Ymin = this.controlsParameters.Ymin, 
			  Ymax = this.controlsParameters.Ymax, 
			  Z = this.controlsParameters.Z;
        this.Xmid = Xmin + (Xmax - Xmin) / 2.0;
        this.Ymid = Ymin + (Ymax - Ymin) / 2.0;

        Camera.d0 = Math.sqrt(Math.pow((Xmax - Xmin) / 2.0 + this.lengthVector, 2) +
            Math.pow((Ymax - Ymin) / 2.0 + this.lengthVector, 2) +
            Math.pow(Z + this.lengthVector, 2));

        this.resetCamera(false);
    },
    generateControlPoints: function () {
		const Xmin = this.controlsParameters.Xmin,
			  Xmax = this.controlsParameters.Xmax, 
			  Ymin = this.controlsParameters.Ymin, 
			  Ymax = this.controlsParameters.Ymax, 
			  Z = this.controlsParameters.Z,
			  N_ctr = this.controlsParameters.N_ctr;
		let pt;
        let vec;
        this.pointsCtr = new Array(N_ctr);
		this.m10Ctr = new Array(N_ctr);
		this.m10PointsCtr = new Array(N_ctr);
		this.pointsVector10Ctr = new Array(N_ctr);
		const m = 2;
        for (let i = 0; i < N_ctr; i++) {
            this.pointsCtr[i] = new Array(m);
			this.m10Ctr[i] = new Array(m);
			this.m10PointsCtr[i] = new Array(m);
			this.pointsVector10Ctr[i] = new Array(m);
			for (let j = 0; j < m; j++) {
				this.pointsVector10Ctr[i][j] = new Array(2);
			}
		}
		
		this.create_coord_tip("10", this.heighTip, N_ctr, m);

		this.create_indexes_tip("10", N_ctr, m);

        for (let i = 0; i < N_ctr; i++)
            for (let j = 0; j < m; j++) {
                const x = Xmin + i * (Xmax - Xmin) / (N_ctr - 1) - this.Xmid;
                const y = Ymin + j * (Ymax - Ymin) / (m - 1) - this.Ymid;
                const z = Z * Math.sin(x) * Math.sin(y);

                this.add_coords(i, j, x, y, z);
            }
			
        for (let i = 0; i < N_ctr; i++)
            for (let j = 0; j < m; j++) {
				if ((i > 0) && (i < N_ctr-1) && (j > 0) && (j < m-1))
					continue;

                let x = 0.0;
                let y = 0.0;
                let z = 0.0;

				if (i == N_ctr - 1) {
					x = this.pointsCtr[i][j].x - this.pointsCtr[i - 1][j].x;
					y = this.pointsCtr[i][j].y - this.pointsCtr[i - 1][j].y;
					z = this.pointsCtr[i][j].z - this.pointsCtr[i - 1][j].z;
				}
				if (i == 0) {
					x = this.pointsCtr[i + 1][j].x - this.pointsCtr[i][j].x;
					y = this.pointsCtr[i + 1][j].y - this.pointsCtr[i][j].y;
					z = this.pointsCtr[i + 1][j].z - this.pointsCtr[i][j].z;
				}

				vec = vec3.normalize(vec3.create(), vec3.fromValues(x, y, z));
				vec = vec3.scale(vec, vec, this.lengthVector);

				pt = new Point(vec[0], vec[1], vec[2]);

				this.m10Ctr[i][j] = pt;
            }

        for (let i = 0; i < N_ctr; i++)
            for (let j = 0; j < m; j++) {
				if ((i > 0) && (i < N_ctr-1) && (j > 0) && (j < m-1))
					continue

               const x = this.pointsCtr[i][j].x + this.m10Ctr[i][j].x;
               const y = this.pointsCtr[i][j].y + this.m10Ctr[i][j].y;
               const z = this.pointsCtr[i][j].z + this.m10Ctr[i][j].z;
               pt = new Point(x, y, z);
               this.m10PointsCtr[i][j] = pt;

               this.setVector(this.pointsCtr[i][j].x, this.pointsCtr[i][j].y, this.pointsCtr[i][j].z,
                   this.m10PointsCtr[i][j].x, this.m10PointsCtr[i][j].y, this.m10PointsCtr[i][j].z,
                   "10", true, i, j, m);
            }


        this.add_vertices(N_ctr, m);
        this.FSIZE = this.verticesCtr.BYTES_PER_ELEMENT;

        this.createIndicesCtr(N_ctr, m);
        this.ISIZE = this.indicesCtr.BYTES_PER_ELEMENT;

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
    setLeftButtonDown: function (value) {
        this.leftButtonDown = value;
    },
    add_coords: function (i, j, x, y, z) {
        const pt = new Point(x, y, z);
        this.pointsCtr[i][j] = pt;
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
			case "10":
               this.verticesVector10TipCtr = new Float32Array(count);
               verticesVectorTipCtr = this.verticesVector10TipCtr;
               break;
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
						
						if (  ((orient == "10") && ((p == 0) || (p == n - 1))) ||
                            ((orient == "axes") && ((p == 0) && (q == 0))) ||
                             (orient == "normals")
                                ) {
                            x = r * Math.cos(phi);
                            y = r * Math.sin(phi);
                            z = height / (this.nLatitudes - 1) * i - height;
                        }
                        else {
                            x = 0.0;
                            y = 0.0;
                            z = 0.0;
                        }

                        verticesVectorTipCtr[k++] = x;
                        verticesVectorTipCtr[k++] = y;
                        verticesVectorTipCtr[k++] = z;
                        verticesVectorTipCtr[k++] = false;
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
			case "10":
               this.indicesVector10TipCtr = new Uint16Array(m_countTipIndices);
               indicesVectorCtr = this.indicesVector10TipCtr;
               break;
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
	setVector: function (x1, y1, z1, x2, y2, z2, orient, create, i, j, M) {
        let pt;
        let ptm;

		let pointsVectorCtr;
        let verticesVectorTip;

        const number = i * M + j;
		
		switch (orient) {
		case "10":
			pointsVectorCtr = this.pointsVector10Ctr;
			verticesVectorTip = this.verticesVector10TipCtr;
			break;
		case "normals":
			verticesVectorTip = this.verticesNormalVectorTip;
			break;
		}
		
		switch (orient) {
		case "10":
			if (create) //create mode
			{
				pt = new Point(x1, y1, z1);
				ptm = new Point(x2, y2, z2);

				pointsVectorCtr[i][j][0] = pt;
				pointsVectorCtr[i][j][1] = ptm;
			}
			else //update mode
			{
				pointsVectorCtr[i][j][0].setPoint(x1, y1, z1);
				pointsVectorCtr[i][j][1].setPoint(x2, y2, z2);
			}
			break;
		}
		
        const vec = vec3.normalize(vec3.create(), vec3.fromValues(x2 - x1, y2 - y1, z2 - z1));
        const q = quat.rotationTo(quat.create(), [0.0, 0.0, 1.0], vec);
        const rotateMatrix = mat4.fromQuat(mat4.create(), q);

        const translateMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(x2, y2, z2));

        const transformMatrix = mat4.mul(mat4.create(), translateMatrix, rotateMatrix);

        this.setTransformMatrix(verticesVectorTip, transformMatrix, number);
		
		if (!create) //update mode
            this.updateVerticesVectorCtr(orient, i, j)
    },
	setSelectVector: function (orient, select, i, j) {
        let pointsVectorCtr;

        switch (orient) {
           case "10":
               pointsVectorCtr = this.pointsVector10Ctr;
               break;
        }

        pointsVectorCtr[i][j][0].select = select;
        pointsVectorCtr[i][j][1].select = select;

        this.updateVerticesVectorCtr(orient, i, j);
    },
    updateVerticesVectorCtr: function (orient, i, j) {
        let pointsVectorCtr;
        let verticesVectorCtr;
        let verticesVectorTipCtr;

        switch (orient) {
           case "10":
               pointsVectorCtr = this.pointsVector10Ctr;
               verticesVectorCtr = this.verticesVector10Ctr;
               verticesVectorTipCtr = this.verticesVector10TipCtr;
               break;
        }

        const M_ctr = 2;
        const number = i * M_ctr + j;

        verticesVectorCtr[2 * number * this.countAttribData] = pointsVectorCtr[i][j][0].x;
        verticesVectorCtr[2 * number * this.countAttribData + 1] = pointsVectorCtr[i][j][0].y;
        verticesVectorCtr[2 * number * this.countAttribData + 2] = pointsVectorCtr[i][j][0].z;
        verticesVectorCtr[2 * number * this.countAttribData + 3] = pointsVectorCtr[i][j][0].select;
        verticesVectorCtr[(2 * number + 1) * this.countAttribData] = pointsVectorCtr[i][j][1].x;
        verticesVectorCtr[(2 * number + 1) * this.countAttribData + 1] = pointsVectorCtr[i][j][1].y;
        verticesVectorCtr[(2 * number + 1) * this.countAttribData + 2] = pointsVectorCtr[i][j][1].z;
        verticesVectorCtr[(2 * number + 1) * this.countAttribData + 3] = pointsVectorCtr[i][j][1].select;

        const countParametersOneTip = this.nLatitudes * this.nLongitudes * this.countAttribData;
        const disp = number * countParametersOneTip;

        for (let l = 0; l < this.nLatitudes; l++)
            for (let k = 0; k < this.nLongitudes; k++)
                verticesVectorTipCtr[disp + (l * this.nLongitudes + k) * this.countAttribData + 3] = pointsVectorCtr[i][j][1].select;
    },
	setTransformMatrix: function (verticesVectorTip, transformMatrix, i) {
        const countParametersOneTip = this.nLatitudes * this.nLongitudes * this.countAttribData;
        const disp = i * countParametersOneTip;

        for (let j = 0; j < this.nLatitudes; j++)
            for (let k = 0; k < this.nLongitudes; k++)
                for (let l = 0; l < 16; l++) {
                    verticesVectorTip[disp + (j * this.nLongitudes + k) * this.countAttribData + 4 + l] = transformMatrix[l];
                }
    },
    createIndicesCtr: function (n, m) {
        let i, j, k = 0;
        this.indicesCtr = new Uint16Array(2 * n * m);

        for (i = 0; i < n; i++)
            for (j = 0; j < m; j++)
                this.indicesCtr[k++] = i * m + j;
        for (j = 0; j < m; j++)
            for (i = 0; i < n; i++)
                this.indicesCtr[k++] = i * m + j;
    },
    createIndicesSurfaceLines: function (n, m) {
        let i, j, k = 0;
        this.indicesSurfaceLines = new Uint16Array(2 * n * m);

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
        this.indicesSurfaceTriangles = new Uint16Array(6 * (n - 1) * (m - 1));

        for (let i = 0; i < n - 1; i++)
            for (let j = 0; j < m - 1; j++) {
                this.indicesSurfaceTriangles[k++] = i * m + j;
                this.indicesSurfaceTriangles[k++] = (i + 1) * m + j;
                this.indicesSurfaceTriangles[k++] = i * m + j + 1;
                this.indicesSurfaceTriangles[k++] = i * m + j + 1;
                this.indicesSurfaceTriangles[k++] = (i + 1) * m + j;
                this.indicesSurfaceTriangles[k++] = (i + 1) * m + j + 1;
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
            if (this.movePoint || this.moveVector10) {
				const M_ctr = 2;
                const offset = this.iMove * M_ctr + this.jMove;
                const winCoord = vec4.create();

                winCoord[0] = x;
                winCoord[1] = y;
				if (this.movePoint)
					winCoord[2] = this.pointsCtr[this.iMove][this.jMove].winz;
                if (this.moveVector10)
					winCoord[2] = this.m10PointsCtr[this.iMove][this.jMove].winz;
                winCoord[3] = 1.0;

                const mvMatr = mat4.mul(mat4.create(), this.cam, this.world);

                const worldCoord = unproject(winCoord, mvMatr, this.proj, this.viewport);
				
				if (this.movePoint) {
                    this.pointsCtr[this.iMove][this.jMove].x = worldCoord[0];
                    this.pointsCtr[this.iMove][this.jMove].y = worldCoord[1];
                    this.pointsCtr[this.iMove][this.jMove].z = worldCoord[2];

                    this.verticesCtr[offset * 4] = this.pointsCtr[this.iMove][this.jMove].x;
                    this.verticesCtr[offset * 4 + 1] = this.pointsCtr[this.iMove][this.jMove].y;
                    this.verticesCtr[offset * 4 + 2] = this.pointsCtr[this.iMove][this.jMove].z;
                    
                    if ((this.jMove > 0) && (this.jMove < M_ctr - 1)) {
                    }
                    else {
	                    this.tPt.x = this.pointsCtr[this.iMove][this.jMove].x - this.OldPt.x;
	                    this.tPt.y = this.pointsCtr[this.iMove][this.jMove].y - this.OldPt.y;
	                    this.tPt.z = this.pointsCtr[this.iMove][this.jMove].z - this.OldPt.z;
	
						this.m10PointsCtr[this.iMove][this.jMove].x = this.OldPtm10.x + this.tPt.x;
						this.m10PointsCtr[this.iMove][this.jMove].y = this.OldPtm10.y + this.tPt.y;
						this.m10PointsCtr[this.iMove][this.jMove].z = this.OldPtm10.z + this.tPt.z;

						this.setVector(this.pointsCtr[this.iMove][this.jMove].x,
									this.pointsCtr[this.iMove][this.jMove].y,
									this.pointsCtr[this.iMove][this.jMove].z,
									this.m10PointsCtr[this.iMove][this.jMove].x,
									this.m10PointsCtr[this.iMove][this.jMove].y,
									this.m10PointsCtr[this.iMove][this.jMove].z, "10", false,
									this.iMove, this.jMove, M_ctr);
					}
                }
                else 
					if (this.moveVector10) {
						this.m10PointsCtr[this.iMove][this.jMove].x = worldCoord[0];
						this.m10PointsCtr[this.iMove][this.jMove].y = worldCoord[1];
						this.m10PointsCtr[this.iMove][this.jMove].z = worldCoord[2];

						this.setVector(this.pointsCtr[this.iMove][this.jMove].x,
										this.pointsCtr[this.iMove][this.jMove].y,
										this.pointsCtr[this.iMove][this.jMove].z,
										this.m10PointsCtr[this.iMove][this.jMove].x,
										this.m10PointsCtr[this.iMove][this.jMove].y,
										this.m10PointsCtr[this.iMove][this.jMove].z, "10", false,
										this.iMove, this.jMove, M_ctr);
					}

                if (this.controlsParameters.ruledSurface)
                    this.calculateRuledSurface();
            }
            else {
                const dx = x - this.lastPosX;
                const dy = y - this.lastPosY;

            this.setXRotation(this.xRot - 8 * dx);
            this.setYRotation(this.yRot - 8 * dy);

                this.lastPosX = x;
                this.lastPosY = y;
            }
            this.setVertexBuffersAndDraw();
        }
        else {
			const M_ctr = 2;
            for (let i = 0; i < this.controlsParameters.N_ctr; i++)
                for (let j = 0; j < M_ctr; j++) {
                    this.pointsCtr[i][j].select = false;

                    if (this.pointsCtr[i][j].ptInRect(x, y))
                        this.pointsCtr[i][j].select = true;

                    this.verticesCtr[(i * M_ctr + j) * 4 + 3] = this.pointsCtr[i][j].select;
					
					if ((j > 0) && (j < M_ctr - 1))
						continue;

					this.m10PointsCtr[i][j].select = false;
					if (((i == 0) || (i == this.controlsParameters.N_ctr - 1)) && (this.m10PointsCtr[i][j].ptInRect(x, y)))
						this.m10PointsCtr[i][j].select = true;

					this.setSelectVector("10", this.m10PointsCtr[i][j].select, i, j);
                }
                this.setVertexBuffersAndDraw();
		}
    },
    mousedownHandler: function (button, x, y) {
        switch (button) {
            case 0: //left button
                this.movePoint = false;
				this.moveVector10 = false;
				
				const M_ctr = 2;
                for (let i = 0; i < this.controlsParameters.N_ctr; i++)
                    for (let j = 0; j < M_ctr; j++) {
                        if (this.pointsCtr[i][j].select == true) {
                            this.movePoint = true;
                            this.iMove = i;
                            this.jMove = j;
							
							if ((j > 0) && (j < M_ctr - 1))
								continue;
			            						
							this.OldPt.setPoint(this.pointsCtr[i][j].x, this.pointsCtr[i][j].y, this.pointsCtr[i][j].z);
							this.OldPtm10.setPoint(this.m10PointsCtr[i][j].x, this.m10PointsCtr[i][j].y, this.m10PointsCtr[i][j].z);
                        }

                        if ((j > 0) && (j < M_ctr - 1))
							continue;

						if (this.m10PointsCtr[i][j].select == true) {
							this.moveVector10 = true;
							this.iMove = i;
							this.jMove = j;
						}
                    }

                if (!this.movePoint && !this.moveVector10) {
                    this.lastPosX = x;
                    this.lastPosY = y;
                }

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
    add_vertices: function (n, m) {
		
		const totalLength = n * m;
		
        this.verticesCtr = new Float32Array(totalLength * 4);
		this.verticesVector10Ctr = new Float32Array(2 * totalLength * this.countAttribData);
        for (let i = 0; i < n; i++)
            for (let j = 0; j < m; j++) {
                const offset = i * m + j;
                this.verticesCtr[offset * 4] = this.pointsCtr[i][j].x;
                this.verticesCtr[offset * 4 + 1] = this.pointsCtr[i][j].y;
                this.verticesCtr[offset * 4 + 2] = this.pointsCtr[i][j].z;
                this.verticesCtr[offset * 4 + 3] = this.pointsCtr[i][j].select;
				if ((i > 0) && (i < n-1) && (j > 0) && (j < m-1))
					continue;
                for (let k = 0; k < 16; k++) {
                    this.verticesVector10Ctr[2 * offset * this.countAttribData + 4 + k] = this.pointsVector10Ctr[i][j][0].transformMatrix[k];
                    this.verticesVector10Ctr[(2 * offset + 1) * this.countAttribData + 4 + k] = this.pointsVector10Ctr[i][j][1].transformMatrix[k];
                }

                this.updateVerticesVectorCtr("10", i, j);
            }
    },
    setVertexBuffersAndDraw: function () {
        let i, j;
        let q, rotateMatrix, translateMatrix, transformMatrix, axesTransformMatrix;
        
        this.cam = Camera.getLookAt(this.wheelDelta, this.xRot, this.yRot);
        this.proj = Camera.getProjMatrix();

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
        // Disable the assignment to a_select variable
        this.gl.disableVertexAttribArray(this.a_select);
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
        // Disable the assignment to a_select variable
        this.gl.disableVertexAttribArray(this.a_select);
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
        
        const mvMatr = mat4.mul(mat4.create(), this.cam, this.world);
        const mvpMatr = mat4.mul(mat4.create(), this.proj, mvMatr);
        
        this.gl.uniformMatrix4fv(this.u_mvpMatrix, false, mvpMatr);
        
        // Bind the buffer object to target
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferCtr);
        // Write date into the buffer object
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesCtr, this.gl.DYNAMIC_DRAW);
        // Assign the buffer object to a_Position variable
        this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, this.FSIZE * 4, 0);
        // Enable the assignment to a_Position variable
        this.gl.enableVertexAttribArray(this.a_Position);
        // Assign the buffer object to a_select variable
        this.gl.vertexAttribPointer(this.a_select, 1, this.gl.FLOAT, false, this.FSIZE * 4, this.FSIZE * 3);
        // Enable the assignment to a_select variable
        this.gl.enableVertexAttribArray(this.a_select);
        // Disable the assignment to a_normal variable
        this.gl.disableVertexAttribArray(this.a_normal);
		// Disable the assignment to a_transformMatrix variable
        this.gl.disableVertexAttribArray(this.a_transformMatrix);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 1);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 2);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 3);

        this.gl.uniform4f(this.u_color, 0.0, 0.0, 0.0, 1.0);
        this.gl.uniform4f(this.u_colorSelect, 0.5, 0.5, 0.0, 1.0);
        this.gl.uniform1f(this.u_pointSize, 7.0);
        this.gl.uniform1f(this.u_pointSizeSelect, 10.0);

		const M_ctr = 2;
        for (j = 0; j < M_ctr; j++)
            for (i = 0; i < this.controlsParameters.N_ctr; i++) {
                this.pointsCtr[i][j].calculateWindowCoordinates(mvpMatr, this.viewport);
				if ((i == 0) || (i == this.controlsParameters.N_ctr - 1))
					this.m10PointsCtr[i][j].calculateWindowCoordinates(mvpMatr, this.viewport);
            }

        // Draw
        if (this.controlsParameters.showCtrPoints)
        		this.gl.drawArrays(this.gl.POINTS, 0, this.controlsParameters.N_ctr * M_ctr);
        if (this.controlsParameters.controlPolygons) {
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBufferCtr);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indicesCtr, this.gl.DYNAMIC_DRAW);

            this.gl.uniform4f(this.u_color, 0.0, 0.0, 1.0, 1.0);
            this.gl.uniform4f(this.u_colorSelect, 0.0, 0.0, 1.0, 1.0);

            for (j = 0; j < M_ctr; j++)
                this.gl.drawElements(this.gl.LINE_STRIP, this.controlsParameters.N_ctr, this.gl.UNSIGNED_SHORT, ((this.controlsParameters.N_ctr * M_ctr + j * this.controlsParameters.N_ctr) * this.ISIZE));
        }
		
        if (this.controlsParameters.showCtrPoints) {
	        this.gl.uniform1f(this.u_useTransformMatrix, true);
            // Bind the buffer object to target
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferVector10Ctr);
            // Write date into the buffer object
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesVector10Ctr, this.gl.DYNAMIC_DRAW);
            this.gl.uniform4f(this.u_color, 1.0, 0.0, 1.0, 1.0);
			// Assign the buffer object to a_Position variable
			this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, 0);
			// Enable the assignment to a_Position variable
			this.gl.enableVertexAttribArray(this.a_Position);
			// Assign the buffer object to a_select variable
			this.gl.vertexAttribPointer(this.a_select, 1, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * 3);
			// Enable the assignment to a_select variable
			this.gl.enableVertexAttribArray(this.a_select);
			// Disable the assignment to a_normal variable
			this.gl.disableVertexAttribArray(this.a_normal);
			// Assign the buffer object to a_transformMatrix variable
			this.gl.vertexAttribPointer(this.a_transformMatrix, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * 4);
			this.gl.vertexAttribPointer(this.a_transformMatrix + 1, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (4 + 4));
			this.gl.vertexAttribPointer(this.a_transformMatrix + 2, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (8 + 4));
			this.gl.vertexAttribPointer(this.a_transformMatrix + 3, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (12 + 4));
			// Enable the assignment to a_transformMatrix variable
			this.gl.enableVertexAttribArray(this.a_transformMatrix);
			this.gl.enableVertexAttribArray(this.a_transformMatrix + 1);
			this.gl.enableVertexAttribArray(this.a_transformMatrix + 2);
			this.gl.enableVertexAttribArray(this.a_transformMatrix + 3);
	
			this.gl.uniform4f(this.u_colorSelect, 0.5, 0.5, 0.0, 1.0);

			this.gl.drawArrays(this.gl.LINES, 0, 2 * this.controlsParameters.N_ctr * M_ctr);
	
	        const countIndicesOneTip = (this.nLatitudes - 1) * this.nLongitudes * 2 * 3;
			// Bind the buffer object to target
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferVector10TipCtr);
			// Write date into the buffer object
			this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesVector10TipCtr, this.gl.DYNAMIC_DRAW);
			this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBufferVector10TipCtr);
			this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indicesVector10TipCtr, this.gl.DYNAMIC_DRAW);
			// Assign the buffer object to a_Position variable
			this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, 0);
			// Enable the assignment to a_Position variable
			this.gl.enableVertexAttribArray(this.a_Position);
			// Assign the buffer object to a_select variable
			this.gl.vertexAttribPointer(this.a_select, 1, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * 3);
			// Enable the assignment to a_select variable
			this.gl.enableVertexAttribArray(this.a_select);
			// Disable the assignment to a_normal variable
			this.gl.disableVertexAttribArray(this.a_normal);
			// Assign the buffer object to a_transformMatrix variable
			this.gl.vertexAttribPointer(this.a_transformMatrix, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * 4);
			this.gl.vertexAttribPointer(this.a_transformMatrix + 1, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (4 + 4));
			this.gl.vertexAttribPointer(this.a_transformMatrix + 2, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (8 + 4));
			this.gl.vertexAttribPointer(this.a_transformMatrix + 3, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (12 + 4));
			// Enable the assignment to a_transformMatrix variable
			this.gl.enableVertexAttribArray(this.a_transformMatrix);
			this.gl.enableVertexAttribArray(this.a_transformMatrix + 1);
			this.gl.enableVertexAttribArray(this.a_transformMatrix + 2);
			this.gl.enableVertexAttribArray(this.a_transformMatrix + 3);

			this.gl.uniform4f(this.u_color, 0.0, 0.0, 0.0, 1.0);
			this.gl.uniform4f(this.u_colorSelect, 0.5, 0.5, 0.0, 1.0);

			this.gl.drawElements(this.gl.TRIANGLES, this.controlsParameters.N_ctr * M_ctr * countIndicesOneTip, this.gl.UNSIGNED_SHORT, 0);
      	}
        if (this.controlsParameters.ruledSurface) {
			const N = this.controlsParameters.N;
			const M = this.controlsParameters.M;
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
            // Disable the assignment to a_select variable
            this.gl.disableVertexAttribArray(this.a_select);
            // Enable the assignment to a_normal variable
            this.gl.enableVertexAttribArray(this.a_normal);
			// Disable the assignment to a_transformMatrix variable
            this.gl.disableVertexAttribArray(this.a_transformMatrix);
            this.gl.disableVertexAttribArray(this.a_transformMatrix + 1);
            this.gl.disableVertexAttribArray(this.a_transformMatrix + 2);
            this.gl.disableVertexAttribArray(this.a_transformMatrix + 3);

            this.gl.uniform4f(this.u_color, 1.0, 0.0, 0.0, 1.0);
            this.gl.uniform1f(this.u_pointSize, 5.0);
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
                this.gl.uniform4f(this.u_color, 0.5075, 0.5075, 0.5075, 1.0);
                this.gl.drawElements(this.gl.TRIANGLES, 6 * (N - 1) * (M - 1), this.gl.UNSIGNED_SHORT, 0);
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
				// Disable the assignment to a_select variable
				this.gl.disableVertexAttribArray(this.a_select);
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
				// Disable the assignment to a_select variable
				this.gl.disableVertexAttribArray(this.a_select);
				// Disable the assignment to a_normal variable
				this.gl.disableVertexAttribArray(this.a_normal);
				// Assign the buffer object to a_transformMatrix variable
				this.gl.vertexAttribPointer(this.a_transformMatrix, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * 4);
				this.gl.vertexAttribPointer(this.a_transformMatrix + 1, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (4 + 4));
				this.gl.vertexAttribPointer(this.a_transformMatrix + 2, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (8 + 4));
				this.gl.vertexAttribPointer(this.a_transformMatrix + 3, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (12 + 4));
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
    calculateRuledSurface: function () {

        let i, j;

        const N_ctr = this.controlsParameters.N_ctr;
        const M_ctr = 2;
        const N = this.controlsParameters.N;
        const M = this.controlsParameters.M;
		
		// расчет координат векторов-производных m10 в граничных точках
        for (i = 0; i < N_ctr; i++)
            for (j = 0; j < M_ctr; j++) {
				if ((j > 0) && (j < M_ctr-1))
					continue;
                this.m10Ctr[i][j].x = this.m10PointsCtr[i][j].x - this.pointsCtr[i][j].x;
                this.m10Ctr[i][j].y = this.m10PointsCtr[i][j].y - this.pointsCtr[i][j].y;
                this.m10Ctr[i][j].z = this.m10PointsCtr[i][j].z - this.pointsCtr[i][j].z;
            }

        // INITIALIZE PARAMETRIC COORDINATES
        for (i = 0; i < N_ctr; i++) 
        {
        	for (j = 0; j < M_ctr; j++)
        	{
				// switch (this.controlsParameters.paramCoords) {
				// case "uniform":
					// this.pointsCtr[i][j].u = u;
					// break;
				// case "chordal":
					// this.pointsCtr[i][j].u = u;
					// break;
				// case "centripetal":
					// this.pointsCtr[i][j].u = u;
					// break;
        	}
        }

        this.pointsSurface = new Array(N);
        this.normalsSurface = new Array(N);
        for (i = 0; i < N; i++) {
            this.pointsSurface[i] = new Array(M);
            this.normalsSurface[i] = new Array(M);
            for (j = 0; j < M; j++)
                this.normalsSurface[i][j] = new Array(3);
        }

        //for (i = 0; i < N; i++)
        //{
        //	for (j = 0; j < M; j++)
        //	{
        //      // CALCULATE SURFACE COORDINATES
        //      const x = ;
        //      const y = ;
        //      const z = ;
        //      
        //      pt = new Point(x, y, z);
        //      this.pointsSurface[i][j] = pt;

        //      //CALCULATE TANGENT VECTORS
        //      const x_u = ;
        //      const y_u = ;
        //      const z_u = ;

        //      const x_v = ;
        //      const y_v = ;
        //      const z_v = ;

        //      const pt_u = vec3.fromValues(x_u, y_u, z_u);
        //      const pt_v = vec3.fromValues(x_v, y_v, z_v);

        //      //CALCULATE NORMAL VECTOR
        //      const normal = vec3.create();

        //      this.normalsSurface[i][j][0] = normal[0];
        //      this.normalsSurface[i][j][1] = normal[1];
        //      this.normalsSurface[i][j][2] = normal[2];
        //	}
        //}

		this.create_coord_tip("normals", this.heighTip, N, M);
        this.create_indexes_tip("normals", N, M);
        this.verticesSurface = new Float32Array(N * M * 6);
        this.verticesNormalVector = new Float32Array(N * M * 6);
        for (i = 0; i < N; i++)
            for (j = 0; j < M; j++) {
                const offset = i * M + j;
                this.verticesSurface[offset * 6    ] = this.pointsSurface[i][j].x;
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
                         "normals", true, i, j, this.controlsParameters.M);
            }

        this.createIndicesSurfaceLines(N, M);
        this.createIndicesSurfaceTriangles(N, M);
    }
}

function mousedown(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.mousedownHandler(EventUtil.getButton(ev), x - rect.left, canvas.height - (y - rect.top));
}

function mouseup(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.mouseupHandler(EventUtil.getButton(ev), x - rect.left, canvas.height - (y - rect.top));
}

function mousemove(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.mousemoveHandler(x - rect.left, canvas.height - (y - rect.top));
}