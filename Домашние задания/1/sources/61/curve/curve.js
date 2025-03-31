// 3.js

// Imports.
import {getShader} from './libs/prepShader.js';
import {initShaders} from './libs/cuon-utils.js';
import * as  dat from './libs/dat.gui.module.js';
import {mat2, mat3, mat4, vec2, vec3, vec4} from './libs/dist/esm/index.js';
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
	
	// Specify the color for clearing <canvas>
    gl.clearColor(0.8, 0.8, 0.8, 1.0);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.viewport(0, 0, canvas.width, canvas.height);

    const projMatrix = mat4.ortho(mat4.create(), 0, gl.drawingBufferWidth, 0, gl.drawingBufferHeight, 0, 1);

    // Pass the projection matrix to the vertex shader
    const u_projMatrix = gl.getUniformLocation(gl.program, 'u_projMatrix');
    if (!u_projMatrix) {
        console.log('Failed to get the storage location of u_projMatrix');
        return;
    }
    gl.uniformMatrix4fv(u_projMatrix, false, projMatrix);

	const gui = new dat.GUI();
	
	const guiCtrPointsParams = gui.addFolder('Control point parameters');
	const guiSplineParams = gui.addFolder('Spline parameters');
	
	guiCtrPointsParams.add(Data.controlsParameters, 'showCtrPoints').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	guiCtrPointsParams.add(Data.controlsParameters, 'controlPolygon').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	
	guiSplineParams.add(Data.controlsParameters, 'naturalSpline').onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'leftBC', ["type 1", "type 2", "type 3", "type 4", "type 5"]).onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'rightBC', ["type 1", "type 2", "type 3", "type 4", "type 5"]).onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'countSplinePoints', 1, 500, 1).onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'paramCoords', ["uniform", "chordal", "centripetal"]).onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'visualize', ["points", "line"]).onChange(function (e) { Data.setVertexBuffersAndDraw(); });

    Data.init(gl);


    // Register function (event handler) to be called on a mouse press
    canvas.onclick = function (ev) { click(ev, canvas); };

    canvas.onmousemove = function (ev) { mousemove(ev, canvas); };

    canvas.onmousedown = function (ev) { mousedown(ev, canvas); };

    canvas.onmouseup = function (ev) { mouseup(ev, canvas); };
}

class Point {
    constructor(x, y) {
        this.select = false;
        // ДОБАВИТЬ ПАРАМЕТРИЧЕСКУЮ КООРДИНАТУ t
		
        this.x = x;
        this.y = y;
        this.transformMatrix = mat4.create();
        this.setRect();
    }
    setPoint(x, y) {
        this.x = x;
        this.y = y;
        this.setRect();
    }
    setRect() {
        this.left = this.x - 10;
        this.right = this.x + 10;
        this.bottom = this.y - 10;
        this.up = this.y + 10;
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

const Data = {
    pointsCtr: [],
    mPointsCtr: [],
    mCtr: [],
    pointsVectorCtr: [],
    pointsVectorTipCtr: [],
    pointsSpline: [],
    countAttribData: 2 + 1 + 16, //x,y,sel,transformMatrix
    verticesCtr: {},
    verticesVectorCtr: {},
    verticesVectorTipCtr: {},
    verticesSpline: {},
    FSIZE: 0,
    gl: null,
    vertexBufferCtr: null,
    vertexBufferVectorCtr: null,
    vertexBufferVectorTipCtr: null,
    vertexBufferSpline: null,
    a_Position: -1,
    a_select: -1,
    a_transformMatrix: -1,
    u_color: null,
    u_colorSelect: null,
    u_pointSize: null,
    u_useTransformMatrix: false,
    movePoint: false,
    moveVector: false,
    iMove: -1,
    OldPt: null,
    OldPtm: null,
    tPt: null,
    leftButtonDown: false,
    isSelectedLeftCtrlPoint: false,
    isSelectedRightCtrlPoint: false,
    controlsParameters: {
		leftBC: "type 2",
		rightBC: "type 2",
		showCtrPoints: true,
        controlPolygon: false,
		naturalSpline: false,
        countSplinePoints: 10,
		paramCoords: "uniform",
		visualize: "points"
	},
    init: function (gl) {
        this.gl = gl;
        // Create a buffer object
        this.vertexBufferCtr = this.gl.createBuffer();
        if (!this.vertexBufferCtr) {
            console.log('Failed to create the buffer object for control points');
            return -1;
        }
        this.vertexBufferVectorCtr = this.gl.createBuffer();
        if (!this.vertexBufferVectorCtr) {
            console.log('Failed to create the buffer object for control points');
            return -1;
        }
        this.vertexBufferVectorTipCtr = this.gl.createBuffer();
        if (!this.vertexBufferVectorTipCtr) {
            console.log('Failed to create the buffer object for control points');
            return -1;
        }
        this.vertexBufferSpline = this.gl.createBuffer();
        if (!this.vertexBufferSpline) {
            console.log('Failed to create the buffer object for spline points');
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
        // Get the storage location of u_useTransformMatrix
        this.u_useTransformMatrix = this.gl.getUniformLocation(this.gl.program, 'u_useTransformMatrix');
        if (!this.u_useTransformMatrix) {
            console.log('Failed to get u_useTransformMatrix variable');
            return;
        }

        this.OldPt = new Point(0, 0);
        this.OldPtm = new Point(0, 0);
        this.tPt = new Point(0, 0);
    },
    setLeftButtonDown: function (value) {
        this.leftButtonDown = value;
    },
    add_coords: function (x, y) {
        const pt = new Point(x, y);
        const ptm = new Point(x + 50, y);
        this.pointsCtr.push(pt);
        this.mPointsCtr.push(ptm);
        this.setVector(pt.x, pt.y, ptm.x, ptm.y, -1);
        this.add_vertices();
    },
    setVector: function (x1, y1, x2, y2, i) {
        let pt;
        let ptm;

        let ux, uy, vx, vy, norm;

        if (i == -1) //create mode
        {
            pt = new Point(x1, y1);
            ptm = new Point(x2, y2);

            this.pointsVectorCtr.push(pt);
            this.pointsVectorCtr.push(ptm);
        }
        else //update mode
        {
            this.pointsVectorCtr[2 * i].setPoint(x1, y1);
            this.pointsVectorCtr[2 * i + 1].setPoint(x2, y2);
        }

        const lengthMax = 90;

        const length = lengthMax * 0.3;
        const rBase = length * 0.25;

        vx = x2 - x1;
        vy = y2 - y1;

        norm = Math.sqrt(vx * vx + vy * vy);

        vx /= norm;
        vy /= norm;

        ux = -vy;
        uy = vx;

        const rotateMatrix = mat4.fromValues(ux, vx, 0.0, 0.0,
            uy, vy, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0)

        const translateMatrix = mat4.fromTranslation(mat4.create(), [x2, y2, 0.0]);
        const transformMatrix = mat4.mul(mat4.create(), translateMatrix, rotateMatrix);

        if (i == -1) //create mode
        {
            pt = new Point(0, 0);
            pt.setTransformMatrix(transformMatrix);
            this.pointsVectorTipCtr.push(pt);
            pt = new Point(-rBase, -length);
            pt.setTransformMatrix(transformMatrix);
            this.pointsVectorTipCtr.push(pt);
            pt = new Point(rBase, -length);
            pt.setTransformMatrix(transformMatrix);
            this.pointsVectorTipCtr.push(pt);
        }
        else //update mode
        {
            this.pointsVectorTipCtr[3 * i].setTransformMatrix(transformMatrix);
            this.pointsVectorTipCtr[3 * i + 1].setTransformMatrix(transformMatrix);
            this.pointsVectorTipCtr[3 * i + 2].setTransformMatrix(transformMatrix);
        }

        if (i != -1) //update mode
            this.updateVerticesVectorCtr(i);
    },
    setSelectVector: function (select, i) {
        this.pointsVectorCtr[2 * i].select = select;
        this.pointsVectorCtr[2 * i + 1].select = select;
        this.pointsVectorTipCtr[3 * i].select = select;
        this.pointsVectorTipCtr[3 * i + 1].select = select;
        this.pointsVectorTipCtr[3 * i + 2].select = select;

        this.updateVerticesVectorCtr(i);
    },
    updateVerticesVectorCtr: function (i) {
        this.verticesVectorCtr[2 * i * this.countAttribData] = this.pointsVectorCtr[2 * i].x;
        this.verticesVectorCtr[2 * i * this.countAttribData + 1] = this.pointsVectorCtr[2 * i].y;
        this.verticesVectorCtr[2 * i * this.countAttribData + 2] = this.pointsVectorCtr[2 * i].select;
        this.verticesVectorCtr[(2 * i + 1) * this.countAttribData] = this.pointsVectorCtr[2 * i + 1].x;
        this.verticesVectorCtr[(2 * i + 1) * this.countAttribData + 1] = this.pointsVectorCtr[2 * i + 1].y;
        this.verticesVectorCtr[(2 * i + 1) * this.countAttribData + 2] = this.pointsVectorCtr[2 * i + 1].select;

        this.verticesVectorTipCtr[3 * i * this.countAttribData] = this.pointsVectorTipCtr[3 * i].x;
        this.verticesVectorTipCtr[3 * i * this.countAttribData + 1] = this.pointsVectorTipCtr[3 * i].y;
        this.verticesVectorTipCtr[3 * i * this.countAttribData + 2] = this.pointsVectorTipCtr[3 * i].select;
        this.verticesVectorTipCtr[(3 * i + 1) * this.countAttribData] = this.pointsVectorTipCtr[3 * i + 1].x;
        this.verticesVectorTipCtr[(3 * i + 1) * this.countAttribData + 1] = this.pointsVectorTipCtr[3 * i + 1].y;
        this.verticesVectorTipCtr[(3 * i + 1) * this.countAttribData + 2] = this.pointsVectorTipCtr[3 * i + 1].select;
        this.verticesVectorTipCtr[(3 * i + 2) * this.countAttribData] = this.pointsVectorTipCtr[3 * i + 2].x;
        this.verticesVectorTipCtr[(3 * i + 2) * this.countAttribData + 1] = this.pointsVectorTipCtr[3 * i + 2].y;
        this.verticesVectorTipCtr[(3 * i + 2) * this.countAttribData + 2] = this.pointsVectorTipCtr[3 * i + 2].select;

        for (let j = 0; j < 16; j++) {
            this.verticesVectorTipCtr[3 * i * this.countAttribData + 3 + j] = this.pointsVectorTipCtr[3 * i].transformMatrix[j];
            this.verticesVectorTipCtr[(3 * i + 1) * this.countAttribData + 3 + j] = this.pointsVectorTipCtr[3 * i + 1].transformMatrix[j];
            this.verticesVectorTipCtr[(3 * i + 2) * this.countAttribData + 3 + j] = this.pointsVectorTipCtr[3 * i + 2].transformMatrix[j];
        }
    },
    mousemoveHandler: function (x, y) {
        if (this.leftButtonDown) {
            if (this.movePoint) {
                this.pointsCtr[this.iMove].setPoint(x, y);

                this.verticesCtr[this.iMove * 3] = this.pointsCtr[this.iMove].x;
                this.verticesCtr[this.iMove * 3 + 1] = this.pointsCtr[this.iMove].y;

                this.tPt.setPoint(this.pointsCtr[this.iMove].x - this.OldPt.x, this.pointsCtr[this.iMove].y - this.OldPt.y);

                this.mPointsCtr[this.iMove].setPoint(this.OldPtm.x + this.tPt.x, this.OldPtm.y + this.tPt.y);

                this.setVector(this.pointsCtr[this.iMove].x, this.pointsCtr[this.iMove].y, this.mPointsCtr[this.iMove].x, this.mPointsCtr[this.iMove].y, this.iMove);
            }
            else
                if (this.moveVector) {
					switch (this.controlsParameters.leftBC) {
					case "type 1":
					case "type 2":
						if ((this.mPointsCtr.length != 0) && (this.mPointsCtr[0].select == true)) {
							this.mPointsCtr[0].setPoint(x, y);

							this.setVector(this.pointsCtr[0].x, this.pointsCtr[0].y, this.mPointsCtr[0].x, this.mPointsCtr[0].y, 0);
						}
						break;
					}
					
					switch (this.controlsParameters.rightBC) {
					case "type 1":
					case "type 2":
						if ((this.mPointsCtr.length != 0) && (this.mPointsCtr[this.mPointsCtr.length - 1].select == true)) {
							this.mPointsCtr[this.mPointsCtr.length - 1].setPoint(x, y);

							this.setVector(this.pointsCtr[this.pointsCtr.length - 1].x, this.pointsCtr[this.pointsCtr.length - 1].y,
								this.mPointsCtr[this.mPointsCtr.length - 1].x, this.mPointsCtr[this.mPointsCtr.length - 1].y,
								this.mPointsCtr.length - 1);
						}
						break;
					}
                }

            if (this.movePoint || this.moveVector) {
                this.setVertexBuffersAndDraw();

                if (this.controlsParameters.naturalSpline)
                    this.calculateNaturalSpline();
            }
        }
        else {
            for (let i = 0; i < this.pointsCtr.length; i++) {
                this.pointsCtr[i].select = false;

                if (this.pointsCtr[i].ptInRect(x, y))
                    this.pointsCtr[i].select = true;

                this.verticesCtr[i * 3 + 2] = this.pointsCtr[i].select;
			}

            this.isSelectedLeftCtrlPoint = false;
            this.isSelectedRightCtrlPoint = false;
            if (this.pointsCtr.length != 0) {
                if (this.pointsCtr[0].select)
                    this.isSelectedLeftCtrlPoint = true;

                if (this.pointsCtr[this.pointsCtr.length - 1].select)
                    this.isSelectedRightCtrlPoint = true;
            }

			switch (this.controlsParameters.leftBC) {
			case "type 1":
			case "type 2":
				if (this.mPointsCtr.length != 0) {
					this.mPointsCtr[0].select = false;

					if (this.mPointsCtr[0].ptInRect(x, y))
						this.mPointsCtr[0].select = true;

					this.setSelectVector(this.mPointsCtr[0].select, 0);
				}
				break;
			}

			switch (this.controlsParameters.rightBC) {
			case "type 1":
			case "type 2":
				if (this.mPointsCtr.length != 0) {
					this.mPointsCtr[this.mPointsCtr.length - 1].select = false;

					if (this.mPointsCtr[this.mPointsCtr.length - 1].ptInRect(x, y))
						this.mPointsCtr[this.mPointsCtr.length - 1].select = true;

					this.setSelectVector(
						this.mPointsCtr[this.mPointsCtr.length - 1].select, this.mPointsCtr.length - 1);
				}
				break;
			}

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
			
            if (this.isSelectedLeftCtrlPoint) {
                this.OldPt.setPoint(this.pointsCtr[0].x, this.pointsCtr[0].y);
                this.OldPtm.setPoint(this.mPointsCtr[0].x, this.mPointsCtr[0].y);
            }

            if (this.isSelectedRightCtrlPoint) {
                this.OldPt.setPoint(
                    this.pointsCtr[this.pointsCtr.length - 1].x, this.pointsCtr[this.pointsCtr.length - 1].y);
                this.OldPtm.setPoint(
                    this.mPointsCtr[this.mPointsCtr.length - 1].x, this.mPointsCtr[this.mPointsCtr.length - 1].y);
            }

            this.moveVector = false;
			
			switch (this.controlsParameters.leftBC) {
			case "type 1":
			case "type 2":
				switch (this.controlsParameters.rightBC) {
				case "type 1":
				case "type 2":
				    if ((this.mPointsCtr.length != 0) &&
						((this.mPointsCtr[0].select == true) || (this.mPointsCtr[this.mPointsCtr.length - 1].select == true)))
						this.moveVector = true;
					break;
				}
				break;
			}

            this.setLeftButtonDown(true);
        }
    },
    mouseupHandler: function (button, x, y) {
        if (button == 0) //left button
            this.setLeftButtonDown(false);
    },
    clickHandler: function (x, y) {
        if (!this.movePoint && !this.moveVector) {
            this.add_coords(x, y);
            if (this.controlsParameters.naturalSpline)
                this.calculateNaturalSpline();
            this.setVertexBuffersAndDraw();
        }
    },
    add_vertices: function () {
        this.verticesCtr = new Float32Array(this.pointsCtr.length * 3);
        this.verticesVectorCtr = new Float32Array(2 * this.pointsCtr.length * this.countAttribData);
        this.verticesVectorTipCtr = new Float32Array(3 * this.pointsCtr.length * this.countAttribData);

        for (let i = 0; i < this.pointsCtr.length; i++) {
            this.verticesCtr[i * 3] = this.pointsCtr[i].x;
            this.verticesCtr[i * 3 + 1] = this.pointsCtr[i].y;
            this.verticesCtr[i * 3 + 2] = this.pointsCtr[i].select;

            for (let j = 0; j < 16; j++) {
                this.verticesVectorCtr[2 * i * this.countAttribData + 3 + j] = this.pointsVectorCtr[2 * i].transformMatrix[j];
                this.verticesVectorCtr[(2 * i + 1) * this.countAttribData + 3 + j] = this.pointsVectorCtr[2 * i + 1].transformMatrix[j];
            }

            this.updateVerticesVectorCtr(i);
        }

        this.FSIZE = this.verticesCtr.BYTES_PER_ELEMENT;
    },
    setVertexBuffersAndDraw: function () {
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
        // Disable the assignment to a_transformMatrix variable
        this.gl.disableVertexAttribArray(this.a_transformMatrix);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 1);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 2);
        this.gl.disableVertexAttribArray(this.a_transformMatrix + 3);

        this.gl.uniform1f(this.u_useTransformMatrix, false);
        // Clear <canvas>
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        // Draw
        if (this.controlsParameters.showCtrPoints) {
            this.gl.uniform4f(this.u_color, 0.0, 0.0, 0.0, 1.0);
            this.gl.uniform4f(this.u_colorSelect, 0.5, 0.5, 0.0, 1.0);
            this.gl.uniform1f(this.u_pointSize, 10.0);
            // Draw
            this.gl.drawArrays(this.gl.POINTS, 0, this.pointsCtr.length);
        }
        if (this.controlsParameters.controlPolygon) {
            this.gl.uniform4f(this.u_color, 0.0, 0.0, 0.0, 1.0);
            this.gl.uniform4f(this.u_colorSelect, 0.0, 0.0, 0.0, 1.0);

            this.gl.drawArrays(this.gl.LINE_STRIP, 0, this.pointsCtr.length);
        }

        if (this.controlsParameters.showCtrPoints) {
            this.gl.uniform4f(this.u_color, 0.0, 0.0, 0.0, 1.0);
            this.gl.uniform4f(this.u_colorSelect, 0.5, 0.5, 0.0, 1.0);
            // Bind the buffer object to target
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferVectorCtr);
            // Write date into the buffer object
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesVectorCtr, this.gl.DYNAMIC_DRAW);
            // Assign the buffer object to a_Position variable
            this.gl.vertexAttribPointer(this.a_Position, 2, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, 0);
            // Enable the assignment to a_Position variable
            this.gl.enableVertexAttribArray(this.a_Position);
            // Assign the buffer object to a_select variable
            this.gl.vertexAttribPointer(this.a_select, 1, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * 2);
            // Enable the assignment to a_select variable
            this.gl.enableVertexAttribArray(this.a_select);
			// Disable the assignment to a_transformMatrix variable
			this.gl.disableVertexAttribArray(this.a_transformMatrix);
			this.gl.disableVertexAttribArray(this.a_transformMatrix + 1);
			this.gl.disableVertexAttribArray(this.a_transformMatrix + 2);
			this.gl.disableVertexAttribArray(this.a_transformMatrix + 3);

			switch (this.controlsParameters.leftBC) {
			case "type 1":
			case "type 2":
				this.gl.drawArrays(this.gl.LINES, 0, 2);
				break;
			}
			switch (this.controlsParameters.rightBC) {
			case "type 1":
			case "type 2":
				this.gl.drawArrays(this.gl.LINES, 2 * this.pointsCtr.length - 2, 2);
				break;
			}

            this.gl.uniform1f(this.u_useTransformMatrix, true);
            // Bind the buffer object to target
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferVectorTipCtr);
            // Write date into the buffer object
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.verticesVectorTipCtr, this.gl.DYNAMIC_DRAW);
            // Assign the buffer object to a_Position variable
            this.gl.vertexAttribPointer(this.a_Position, 2, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, 0);
            // Enable the assignment to a_Position variable
            this.gl.enableVertexAttribArray(this.a_Position);
            // Assign the buffer object to a_select variable
            this.gl.vertexAttribPointer(this.a_select, 1, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * 2);
            // Enable the assignment to a_select variable
            this.gl.enableVertexAttribArray(this.a_select);
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
			
			switch (this.controlsParameters.leftBC) {
			case "type 1":
			case "type 2":
				this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
				break;
			}
			switch (this.controlsParameters.rightBC) {
			case "type 1":
			case "type 2":
				this.gl.drawArrays(this.gl.TRIANGLES, 3 * this.pointsCtr.length - 3, 3);
				break;
			}
        }

        if (this.controlsParameters.naturalSpline) {
            this.gl.uniform1f(this.u_useTransformMatrix, false);
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
            //// Assign the buffer object to a_transformMatrix variable
            //this.gl.vertexAttribPointer(this.a_transformMatrix, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * 3);
            //this.gl.vertexAttribPointer(this.a_transformMatrix + 1, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (4 + 3));
            //this.gl.vertexAttribPointer(this.a_transformMatrix + 2, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (8 + 3));
            //this.gl.vertexAttribPointer(this.a_transformMatrix + 3, 4, this.gl.FLOAT, false, this.FSIZE * this.countAttribData, this.FSIZE * (12 + 3));
            // Disable the assignment to a_transformMatrix variable
            this.gl.disableVertexAttribArray(this.a_transformMatrix);
            this.gl.disableVertexAttribArray(this.a_transformMatrix + 1);
            this.gl.disableVertexAttribArray(this.a_transformMatrix + 2);
            this.gl.disableVertexAttribArray(this.a_transformMatrix + 3);

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
    calculateAndDraw: function () {
		if (this.controlsParameters.naturalSpline)
			this.calculateNaturalSpline();
        
        this.setVertexBuffersAndDraw();
    },
    calculateNaturalSpline: function () {
		let i, j;
        let pt;
        let x, y;
		let m0;
        let mN;

        // расчет координат векторов первых или вторых производных

		switch (this.controlsParameters.leftBC) {
		case "type 1":
		case "type 2":
			x = this.mPointsCtr[0].x - this.pointsCtr[0].x;
			y = this.mPointsCtr[0].y - this.pointsCtr[0].y;

			pt = new Point(x, y);

			m0 = pt;
			break;
		}

		switch (this.controlsParameters.rightBC) {
		case "type 1":
		case "type 2":
			x = this.mPointsCtr[this.mPointsCtr.length - 1].x - this.pointsCtr[this.pointsCtr.length - 1].x;
			y = this.mPointsCtr[this.mPointsCtr.length - 1].y - this.pointsCtr[this.pointsCtr.length - 1].y;

			pt = new Point(x, y);

			mN = pt;
			break;
		}

        // РАССЧИТАТЬ ЗНАЧЕНИЕ ПАРАМЕТРИЧЕСКИХ КООРДИНАТ КОНТРОЛЬНЫХ ТОЧЕК
        switch (this.controlsParameters.paramCoords) {
		case "uniform":
			// this.pointsCtr[i].t = ;
			break;
		case "chordal":
			// this.pointsCtr[i].t = ;
			break;
		case "centripetal":
			// this.pointsCtr[i].t = ;
			break;
		}

        const N = this.controlsParameters.countSplinePoints;
        this.pointsSpline = new Array(N);

        // РАСЧЕТ КООРДИНАТ ТОЧКИ СПЛАЙНА
        //pt = new Point(x, y);
        //this.pointsSpline[j]=pt;

        this.verticesSpline = new Float32Array(this.pointsSpline.length * 2);
        for (j = 0; j < this.pointsSpline.length; j++) {
            this.verticesSpline[j * 2] = this.pointsSpline[j].x;
            this.verticesSpline[j * 2 + 1] = this.pointsSpline[j].y;
        }
    }
}

function click(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.clickHandler(x - rect.left, canvas.height - (y - rect.top));
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

window.onload = main;