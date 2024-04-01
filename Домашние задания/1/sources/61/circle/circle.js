// 1.js

"use strict";

// Vertex shader program
const VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute float a_select;\n' +
    'uniform mat4 u_projMatrix;\n' +
    'uniform float u_pointSize;\n' +
    'uniform vec4 u_color;\n' +
    'uniform vec4 u_colorSelect;\n' +
    'varying vec4 v_color;\n' +
    'void main() {\n' +
    '  gl_Position = u_projMatrix * a_Position;\n' +
    '  gl_PointSize = u_pointSize;\n' +
    '  if (a_select != 0.0)\n' +
    '    v_color = u_colorSelect;\n' +
    '  else\n' +
    '    v_color = u_color;\n' +
    '}\n';

// Fragment shader program
const FSHADER_SOURCE =
    'precision mediump float;\n' +
    'varying vec4 v_color;\n' +
    'void main() {\n' +
    '  gl_FragColor = v_color;\n' +
    '}\n';
	
const {mat2, mat3, mat4, vec2, vec3, vec4} = glMatrix;

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

    gl.viewport(0, 0, canvas.width, canvas.height);

    const projMatrix = mat4.ortho(mat4.create(), 0, gl.drawingBufferWidth, 0, gl.drawingBufferHeight, 0, 1);

    // Pass the projection matrix to the vertex shader
    const u_projMatrix = gl.getUniformLocation(gl.program, 'u_projMatrix');
    if (!u_projMatrix) {
        console.log('Failed to get the storage location of u_projMatrix');
        return;
    }
    gl.uniformMatrix4fv(u_projMatrix, false, projMatrix);
	
	// Specify the color for clearing <canvas>
    gl.clearColor(0.8, 0.8, 0.8, 1.0);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

	const gui = new dat.GUI();
	
	const guiCtrPointsParams = gui.addFolder('Control point parameters');
	const guiSplineParams = gui.addFolder('Spline parameters');
	const guiCircleParams = gui.addFolder('Circle parameters');
	
	guiCtrPointsParams.add(Data.controlsParameters, 'showCtrPoints').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	guiCtrPointsParams.add(Data.controlsParameters, 'controlPolygon').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	
	guiSplineParams.add(Data.controlsParameters, 'spline').onChange(function (e) { Data.calculateSplineAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'countSplinePoints', 1, 300, 1).onChange(function (e) { Data.calculateSplineAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'visualize', ["points", "line"]).onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	
	Data.init(gl, canvas);
	
	guiCircleParams.add(Data.controlsParameters, 'countCirclePoints', 1, 300, 1).onChange(function (e) { Data.calculateCircleAndDraw(); });
	guiCircleParams.add(Data.controlsParameters, 'circle').onChange(function (e) { Data.calculateCircleAndDraw(); });
	guiCircleParams.add(Data.controlsParameters, 'x0', 1, canvas.width, 1).onChange(function (e) { Data.calculateCtrPointsAndSpline(); });
	guiCircleParams.add(Data.controlsParameters, 'y0', 1, canvas.height, 1).onChange(function (e) { Data.calculateCtrPointsAndSpline(); });
	guiCircleParams.add(Data.controlsParameters, 'radius', 1, canvas.height / 2, 1).onChange(function (e) { Data.calculateCtrPointsAndSpline(); });


    // Register function (event handler) to be called on a mouse press
    canvas.onmousemove = function (ev) { mousemove(ev, canvas); };

    canvas.onmousedown = function (ev) { mousedown(ev, canvas); };

    canvas.onmouseup = function (ev) { mouseup(ev, canvas); };
}

class Point {
    constructor(x, y) {
        this.select = false;
        this.h = 1;
        this.x = x;
        this.y = y;
        this.setRect();
    }
    setPoint(x, y, h) {
        this.x = x;
        this.y = y;
        if (h != undefined)
            this.h = h;
        this.setRect();
    }
    setRect() {
        this.left = this.x - 5;
        this.right = this.x + 5;
        this.bottom = this.y - 5;
        this.up = this.y + 5;
    }
    ptInRect(x, y) {
        const inX = this.left <= x && x <= this.right;
        const inY = this.bottom <= y && y <= this.up;
        return inX && inY;
    }
}

const Data = {
    pointsCtr: [],
    pointsSpline: [],
    pointsCircle: [],
    countAttribData: 3, //x,y,sel
    verticesCtr: {},
    verticesSpline: {},
    verticesCircle: {},
    FSIZE: 0,
    gl: null,
    vertexBufferCtr: null,
    vertexBufferSpline: null,
    vertexBufferCircle: null,
    a_Position: -1,
    a_select: -1,
    u_color: null,
    u_colorSelect: null,
    u_pointSize: null,
    movePoint: false,
    iMove: -1,
    leftButtonDown: false,
    controlsParameters: {
		showCtrPoints: true,
        controlPolygon: false,
		spline: false,
        countSplinePoints: 10,
		countCirclePoints: 100,
		circle: true,
		x0: 0,
		y0: 0,
		radius: 0,
		visualize: "points"
	},
    init: function (gl, canvas) {
        this.gl = gl;
        // Create a buffer object
        this.vertexBufferCtr = this.gl.createBuffer();
        if (!this.vertexBufferCtr) {
            console.log('Failed to create the buffer object for control points');
            return -1;
        }
        this.vertexBufferSpline = this.gl.createBuffer();
        if (!this.vertexBufferSpline) {
            console.log('Failed to create the buffer object for spline points');
            return -1;
        }
        this.vertexBufferCircle = this.gl.createBuffer();
        if (!this.vertexBufferCircle) {
            console.log('Failed to create the buffer object for circle points');
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
		
		this.controlsParameters.x0 = canvas.width / 2;
		this.controlsParameters.y0 = canvas.height / 2;
		this.controlsParameters.radius = canvas.height / 4;

        //ЗАДАТЬ КОЛИЧЕСТВО КОНТРОЛЬНЫХ ТОЧЕК
        this.countCtrPoints = 0;

        this.setCountCtrPoints();
    },
    setLeftButtonDown: function (value) {
        this.leftButtonDown = value;
    },
    setCountCtrPoints: function () {
        this.pointsCtr = new Array(this.countCtrPoints);
        for (let i = 0; i < this.countCtrPoints; i++)
            this.pointsCtr[i] = new Point(0, 0);

        this.setCtrPoints();
    },
    mousemoveHandler: function (x, y) {
        if (this.leftButtonDown) {
            if (this.movePoint) {
                this.pointsCtr[this.iMove].setPoint(x, y);

                this.verticesCtr[this.iMove * this.countAttribData] = this.pointsCtr[this.iMove].x;
                this.verticesCtr[this.iMove * this.countAttribData + 1] = this.pointsCtr[this.iMove].y;

                this.setVertexBuffersAndDraw();

                if (this.controlsParameters.spline)
                    this.calculateSpline();
            }
        }
        else
            for (let i = 0; i < this.pointsCtr.length; i++) {
                this.pointsCtr[i].select = false;

                if (this.pointsCtr[i].ptInRect(x, y))
                    this.pointsCtr[i].select = true;

                this.verticesCtr[i * this.countAttribData + 2] = this.pointsCtr[i].select;

                this.setVertexBuffersAndDraw();
            }
    },
    mousedownHandler: function (button, x, y) {

        if (button == 0) { //left button
            this.movePoint = false;

            for (let i = 0; i < this.pointsCtr.length; i++) {
                if (this.pointsCtr[i].select == true) {
                    this.movePoint = true;
                    this.iMove = i;
                }
            }

            this.setLeftButtonDown(true);
        }
    },
    mouseupHandler: function (button, x, y) {
        if (button == 0) //left button
            this.setLeftButtonDown(false);
    },
    setVertices: function () {
        this.verticesCtr = new Float32Array(this.pointsCtr.length * this.countAttribData);
        for (let i = 0; i < this.pointsCtr.length; i++) {
            this.verticesCtr[i * this.countAttribData] = this.pointsCtr[i].x;
            this.verticesCtr[i * this.countAttribData + 1] = this.pointsCtr[i].y;
            this.verticesCtr[i * this.countAttribData + 2] = this.pointsCtr[i].select;
        }
        this.FSIZE = this.verticesCtr.BYTES_PER_ELEMENT;
    },
    setVertexBuffersAndDraw: function () {
        // Clear <canvas>
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        if (this.controlsParameters.circle) {
            // Bind the buffer object to target
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferCircle);
            // Write date into the buffer object
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesCircle, this.gl.DYNAMIC_DRAW);
            // Assign the buffer object to a_Position variable
            this.gl.vertexAttribPointer(this.a_Position, 2, this.gl.FLOAT, false, 0, 0);
            // Enable the assignment to a_Position variable
            this.gl.enableVertexAttribArray(this.a_Position);
            // Disable the assignment to a_select variable
            this.gl.disableVertexAttribArray(this.a_select);


            this.gl.uniform4f(this.u_color, 0.0, 0.0, 1.0, 1.0);
            this.gl.uniform1f(this.u_pointSize, 10.0);

            this.gl.drawArrays(this.gl.LINE_STRIP, 0, this.pointsCircle.length);
        }

        if (this.pointsCtr.length == 0)
            return;

        // Bind the buffer object to target
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferCtr);
        // Write date into the buffer object
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesCtr, this.gl.DYNAMIC_DRAW);
        // Assign the buffer object to a_Position variable
        this.gl.vertexAttribPointer(this.a_Position, 2, this.gl.FLOAT, false, this.FSIZE * 3, 0);
        // Enable the assignment to a_Position variable
        this.gl.enableVertexAttribArray(this.a_Position);
        // Assign the buffer object to a_select variable
        this.gl.vertexAttribPointer(this.a_select, 1, this.gl.FLOAT, false, this.FSIZE * 3, this.FSIZE * 2);
        // Enable the assignment to a_select variable
        this.gl.enableVertexAttribArray(this.a_select);

        this.gl.uniform4f(this.u_color, 0.0, 0.0, 0.0, 1.0);
        this.gl.uniform4f(this.u_colorSelect, 0.5, 0.5, 0.0, 1.0);
        this.gl.uniform1f(this.u_pointSize, 10.0);
        // Draw
        if (this.controlsParameters.showCtrPoints)
        	this.gl.drawArrays(this.gl.POINTS, 0, this.pointsCtr.length);
        if (this.controlsParameters.controlPolygon) {
            this.gl.uniform4f(this.u_color, 0.0, 0.0, 0.0, 1.0);
            this.gl.uniform4f(this.u_colorSelect, 0.0, 0.0, 0.0, 1.0);

            this.gl.drawArrays(this.gl.LINE_STRIP, 0, this.pointsCtr.length);
        }
	if (this.controlsParameters.spline) {
            // Bind the buffer object to target
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferSpline);
            // Write date into the buffer object
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesSpline, this.gl.DYNAMIC_DRAW);
            // Assign the buffer object to a_Position variable
            this.gl.vertexAttribPointer(this.a_Position, 2, this.gl.FLOAT, false, 0, 0);
            // Enable the assignment to a_Position variable
            this.gl.enableVertexAttribArray(this.a_Position);
            // Disable the assignment to a_select variable
            this.gl.disableVertexAttribArray(this.a_select);

            this.gl.uniform4f(this.u_color, 1.0, 0.0, 0.0, 1.0);
            this.gl.uniform1f(this.u_pointSize, 7.0);

			switch (this.controlsParameters.visualize) {
            case "points":
                this.gl.drawArrays(this.gl.POINTS, 0, this.pointsSpline.length);
				break;
			case "line":
                this.gl.drawArrays(this.gl.LINE_STRIP, 0, this.pointsSpline.length);
				break;
			}
        }
    },
	calculateCtrPointsAndSpline: function () {
		this.setCtrPoints();
		this.calculateSplineAndDraw();
    },
    calculateSplineAndDraw: function () {
		if (this.controlsParameters.spline)
			this.calculateSpline();
        
        this.setVertexBuffersAndDraw();
    },
	calculateCircleAndDraw: function () {
		if (this.controlsParameters.circle)
			this.calculateCirclePoints();
        
        this.setVertexBuffersAndDraw();
    },
    setCtrPoints: function () {
        const x0 = this.controlsParameters.x0;
        const y0 = this.controlsParameters.y0;
        const r =  this.controlsParameters.radius;

        // ЗАДАТЬ КООРДИНАТЫ КОНТРОЛЬНЫХ ТОЧЕК
        //this.pointsCtr[0].setPoint(x0 + r, y0, 1);

        this.setVertices();

        this.calculateCircleAndDraw();
    },
    calculateSpline: function () {
		let pt;
        let t, x, y, dt;
		
        const N = this.controlsParameters.countSplinePoints;
        this.pointsSpline = new Array(N);

        // РАСЧЕТ КООРДИНАТ ТОЧКИ СПЛАЙНА

        //pt = new Point(x, y);
        //this.pointsSpline[j]=pt;

        this.verticesSpline = new Float32Array(N * 2);
        for (j = 0; j < this.pointsSpline.length; j++) {
            this.verticesSpline[j * 2] = this.pointsSpline[j].x;
            this.verticesSpline[j * 2 + 1] = this.pointsSpline[j].y;
        }
    },
    calculateCirclePoints: function () {
        let pt;
        let i;
        let phi, x, y, dPhi;

        const x0 = parseInt(this.controlsParameters.x0);
        const y0 = parseInt(this.controlsParameters.y0);
        const r = parseInt(this.controlsParameters.radius);

        const N = this.controlsParameters.countCirclePoints;
        this.pointsCircle = new Array(N);

        dPhi = 2.0 * Math.PI / (N - 1);
        phi = 0;

        for (i = 0; i < N; i++) {
            x = x0 + r * Math.cos(phi);
            y = y0 + r * Math.sin(phi);
            pt = new Point(x, y);

            phi += dPhi;

            this.pointsCircle[i] = pt;
        }

        this.verticesCircle = new Float32Array(N * 2);

        for (i = 0; i < N; i++) {
            this.verticesCircle[i * 2] = this.pointsCircle[i].x;
            this.verticesCircle[i * 2 + 1] = this.pointsCircle[i].y;
        }
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
    //if (ev.buttons == 1)
    //    alert('with left key');
    Data.mousemoveHandler(x - rect.left, canvas.height - (y - rect.top));
}