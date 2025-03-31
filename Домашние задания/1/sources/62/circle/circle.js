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
	const guiCircleParams = gui.addFolder('Circle parameters');
	
	guiCtrPointsParams.add(Data.controlsParameters, 'showCtrPoints').onChange(function (e) { Data.draw(); });
	guiCtrPointsParams.add(Data.controlsParameters, 'controlPolygon').onChange(function (e) { Data.draw(); });
	
	guiSplineParams.add(Data.controlsParameters, 'spline').onChange(function (e) { Data.calculateSplineAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'countSplinePoints', 1, 500, 1).onChange(function (e) { Data.calculateSplineAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'visualize', ["points", "line"]).onChange(function (e) { Data.draw(); });

    Data.init(canvas, ctx);
	
	guiCircleParams.add(Data.controlsParameters, 'circle').onChange(function (e) { Data.draw(); });
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
	canvas: null,
	ctx: null,
    movePoint: false,
    iMove: -1,
    leftButtonDown: false,
    controlsParameters: {
		showCtrPoints: true,
        controlPolygon: false,
		spline: false,
        countSplinePoints: 10,
		circle: true,
		x0: 0,
		y0: 0,
		radius: 0,
		visualize: "points"
	},
    init: function (canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
		
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

                this.draw();

                if (this.controlsParameters.spline)
                    this.calculateSpline();
            }
        }
        else
            for (let i = 0; i < this.pointsCtr.length; i++) {
                this.pointsCtr[i].select = false;

                if (this.pointsCtr[i].ptInRect(x, y))
                    this.pointsCtr[i].select = true;

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

            this.setLeftButtonDown(true);
        }
    },
    mouseupHandler: function (button, x, y) {
        if (button == 0) //left button
            this.setLeftButtonDown(false);
    },
    draw: function () {
        // Clear <canvas>
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.controlsParameters.circle) {
			const x0 = parseInt(this.controlsParameters.x0);
			const y0 = parseInt(this.controlsParameters.y0);
			const r = parseInt(this.controlsParameters.radius);
		
			this.ctx.strokeStyle = "blue";
			this.ctx.beginPath();
			this.ctx.arc(x0, y0, r, 0, 2*Math.PI, false);
			this.ctx.stroke();
        }
		
        if (this.pointsCtr.length == 0)
            return;

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
        if (this.controlsParameters.spline) {
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
	calculateCtrPointsAndSpline: function () {
		this.setCtrPoints();
		this.calculateSplineAndDraw();
    },
    calculateSplineAndDraw: function () {
		if (this.controlsParameters.spline)
			this.calculateSpline();
        
        this.draw();
    },
    setCtrPoints: function () {
        const x0 = this.controlsParameters.x0;
        const y0 = this.controlsParameters.y0;
        const r =  this.controlsParameters.radius;

        // ЗАДАТЬ КООРДИНАТЫ КОНТРОЛЬНЫХ ТОЧЕК
        //this.pointsCtr[0].setPoint(x0 + r, y0, 1);

        this.draw();
    },
    calculateSpline: function () {
		let pt;
        let t, x, y, dt;
		
        const N = this.controlsParameters.countSplinePoints;
        this.pointsSpline = new Array(N);

        // РАСЧЕТ КООРДИНАТ ТОЧКИ СПЛАЙНА

        //pt = new Point(x, y);
        //this.pointsSpline[j]=pt;
    }
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