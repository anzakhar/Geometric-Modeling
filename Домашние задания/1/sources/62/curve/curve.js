// 1.js

// Imports.
import * as  dat from './libs/dat.gui.module.js';
import {EventUtil} from './libs/EventUtil.js';

async function main() {
    // Retrieve <canvas> element
    const canvas = document.getElementById('mycanvas');
	canvas.width  = document.documentElement.clientWidth;
	canvas.height = document.documentElement.clientHeight;

    // Get the rendering context for 2DCG
    const ctx = canvas.getContext('2d');
	
	const gui = new dat.GUI();;
	
	const guiCtrPointsParams = gui.addFolder('Control point parameters');
	const guiSplineParams = gui.addFolder('Spline parameters');
	
	guiCtrPointsParams.add(Data.controlsParameters, 'showCtrPoints').onChange(function (e) { Data.draw(); });
	guiCtrPointsParams.add(Data.controlsParameters, 'controlPolygon').onChange(function (e) { Data.draw(); });
	
	guiSplineParams.add(Data.controlsParameters, 'naturalSpline').onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'leftBC', ["type 1", "type 2", "type 3", "type 4", "type 5"]).onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'rightBC', ["type 1", "type 2", "type 3", "type 4", "type 5"]).onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'countSplinePoints', 1, 500, 1).onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'paramCoords', ["uniform", "chordal", "centripetal"]).onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'visualize', ["points", "line"]).onChange(function (e) { Data.draw(); });

    Data.init(canvas, ctx);

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
		this.transformMatrix = [];
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
	canvas: null,
	ctx: null,
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
    init: function (canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
		
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

        // const rotateMatrix = mat4.fromValues(ux, vx, 0.0, 0.0,
            // uy, vy, 0.0, 0.0,
            // 0.0, 0.0, 1.0, 0.0,
            // 0.0, 0.0, 0.0, 1.0)

        // const translateMatrix = mat4.fromTranslation(mat4.create(), [x2, y2, 0.0]);
        // const transformMatrix = mat4.mul(mat4.create(), translateMatrix, rotateMatrix);
		
		const transformMatrix = [ux, vx, uy, vy, x2, y2];

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
    },
    setSelectVector: function (select, i) {
        this.pointsVectorCtr[2 * i].select = select;
        this.pointsVectorCtr[2 * i + 1].select = select;
        this.pointsVectorTipCtr[3 * i].select = select;
        this.pointsVectorTipCtr[3 * i + 1].select = select;
        this.pointsVectorTipCtr[3 * i + 2].select = select;
    },
    mousemoveHandler: function (x, y) {
        if (this.leftButtonDown) {
            if (this.movePoint) {
                this.pointsCtr[this.iMove].setPoint(x, y);
				
				this.tPt.setPoint(this.pointsCtr[this.iMove].x - this.OldPt.x, this.pointsCtr[this.iMove].y - this.OldPt.y);

                this.mPointsCtr[this.iMove].setPoint(this.OldPtm.x + this.tPt.x, this.OldPtm.y + this.tPt.y);

                this.setVector(this.pointsCtr[this.iMove].x, this.pointsCtr[this.iMove].y, this.mPointsCtr[this.iMove].x, this.mPointsCtr[this.iMove].y, this.iMove);

                this.draw();
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
					this.draw();
				
					if (this.controlsParameters.naturalSpline)
						this.calculateNaturalSpline();
				}
        }
        else {
            for (let i = 0; i < this.pointsCtr.length; i++) {
                this.pointsCtr[i].select = false;

                if (this.pointsCtr[i].ptInRect(x, y))
                    this.pointsCtr[i].select = true;
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

            this.draw();
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
            this.draw();
        }
    },
    draw: function () {
        if (this.pointsCtr.length == 0)
            return;

        // Clear <canvas>
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw
        if (this.controlsParameters.showCtrPoints) {
			for (const point of this.pointsCtr) {
				if (point.select)
					this.ctx.fillStyle = "GoldenRod";
				else
					this.ctx.fillStyle = "black";
				this.ctx.beginPath();
				this.ctx.arc(point.x, point.y, 5, 0, 2*Math.PI, false);
				this.ctx.fill();
			}
		}
        if (this.controlsParameters.controlPolygon) {		
			this.ctx.strokeStyle = "black";
			this.ctx.beginPath();
			for (let i=0; i<this.pointsCtr.length; i++)
				if (i==0)
					this.ctx.moveTo(this.pointsCtr[i].x, this.pointsCtr[i].y);
				else
					this.ctx.lineTo(this.pointsCtr[i].x, this.pointsCtr[i].y);
			this.ctx.stroke();
        }
		
		
		if (this.controlsParameters.showCtrPoints) {
			
			switch (this.controlsParameters.leftBC) {
			case "type 1":
			case "type 2":
				if (this.pointsVectorCtr[0].select)
					this.ctx.strokeStyle = "GoldenRod";
				else
					this.ctx.strokeStyle = "black";
				
				this.ctx.beginPath();
				this.ctx.moveTo(this.pointsVectorCtr[0].x, this.pointsVectorCtr[0].y);
				this.ctx.lineTo(this.pointsVectorCtr[1].x, this.pointsVectorCtr[1].y);
				this.ctx.stroke();
				
				this.ctx.save();
				if (this.pointsVectorCtr[0].select)
					this.ctx.fillStyle = "GoldenRod";
				else
					this.ctx.fillStyle = "black";
				this.ctx.transform(	
				    this.pointsVectorTipCtr[0].transformMatrix[0],
					this.pointsVectorTipCtr[0].transformMatrix[1], 
					this.pointsVectorTipCtr[0].transformMatrix[2], 
					this.pointsVectorTipCtr[0].transformMatrix[3], 
					this.pointsVectorTipCtr[0].transformMatrix[4], 
					this.pointsVectorTipCtr[0].transformMatrix[5]);
				this.ctx.beginPath();
				this.ctx.moveTo(this.pointsVectorTipCtr[0].x, this.pointsVectorTipCtr[0].y);
				this.ctx.lineTo(this.pointsVectorTipCtr[1].x, this.pointsVectorTipCtr[1].y);
				this.ctx.lineTo(this.pointsVectorTipCtr[2].x, this.pointsVectorTipCtr[2].y);
				this.ctx.closePath();
				this.ctx.fill();
				this.ctx.restore();
				break;
			}
			
			switch (this.controlsParameters.rightBC) {
			case "type 1":
			case "type 2":
				if (this.pointsVectorCtr[2 * this.pointsCtr.length - 2].select)
					this.ctx.strokeStyle = "GoldenRod";
				else
					this.ctx.strokeStyle = "black";
				this.ctx.beginPath();
				this.ctx.moveTo(this.pointsVectorCtr[2 * this.pointsCtr.length - 2].x, this.pointsVectorCtr[2 * this.pointsCtr.length - 2].y);
				this.ctx.lineTo(this.pointsVectorCtr[2 * this.pointsCtr.length - 1].x, this.pointsVectorCtr[2 * this.pointsCtr.length - 1].y);
				this.ctx.stroke();
				
				this.ctx.save();
				if (this.pointsVectorTipCtr[3 * this.pointsCtr.length - 3].select)
					this.ctx.fillStyle = "GoldenRod";
				else
					this.ctx.fillStyle = "black"
				this.ctx.transform(
				    this.pointsVectorTipCtr[3 * this.pointsCtr.length - 3].transformMatrix[0],
					this.pointsVectorTipCtr[3 * this.pointsCtr.length - 3].transformMatrix[1], 
					this.pointsVectorTipCtr[3 * this.pointsCtr.length - 3].transformMatrix[2], 
					this.pointsVectorTipCtr[3 * this.pointsCtr.length - 3].transformMatrix[3], 
					this.pointsVectorTipCtr[3 * this.pointsCtr.length - 3].transformMatrix[4], 
					this.pointsVectorTipCtr[3 * this.pointsCtr.length - 3].transformMatrix[5]);
				this.ctx.beginPath();
				this.ctx.moveTo(this.pointsVectorTipCtr[3 * this.pointsCtr.length - 3].x, this.pointsVectorTipCtr[3 * this.pointsCtr.length - 3].y);
				this.ctx.lineTo(this.pointsVectorTipCtr[3 * this.pointsCtr.length - 2].x, this.pointsVectorTipCtr[3 * this.pointsCtr.length - 2].y);
				this.ctx.lineTo(this.pointsVectorTipCtr[3 * this.pointsCtr.length - 1].x, this.pointsVectorTipCtr[3 * this.pointsCtr.length - 1].y);
				this.ctx.closePath();
				this.ctx.fill();
				this.ctx.restore();
				break;
			}
        }
		
		
		
        if (this.controlsParameters.naturalSpline) {
			switch (this.controlsParameters.visualize) {
            case "points":
				this.ctx.fillStyle = "red";
				for (const point of this.pointsSpline) {
					this.ctx.beginPath();
					this.ctx.arc(point.x, point.y, 3, 0, 2*Math.PI, false);
					this.ctx.fill();
				}
				break;
			case "line":
				this.ctx.strokeStyle = "red";
				this.ctx.beginPath();
				for (let i=0; i<this.pointsSpline.length; i++)
					if (i==0)
						this.ctx.moveTo(this.pointsSpline[i].x, this.pointsSpline[i].y);
					else
						this.ctx.lineTo(this.pointsSpline[i].x, this.pointsSpline[i].y);
				this.ctx.stroke();
				break;
			}
        }
    },
    calculateAndDraw: function () {
		if (this.controlsParameters.naturalSpline)
			this.calculateNaturalSpline();
        
        this.draw();
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
    }
}

function click(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.clickHandler(x - rect.left, y - rect.top);
}

function mousedown(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.mousedownHandler(EventUtil.getButton(ev), x - rect.left, y - rect.top);
}

function mouseup(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.mouseupHandler(EventUtil.getButton(ev), x - rect.left, y - rect.top);
}

function mousemove(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();
    //if (ev.buttons == 1)
    //    alert('with left key');
    Data.mousemoveHandler(x - rect.left, y - rect.top);
}

window.onload = main;