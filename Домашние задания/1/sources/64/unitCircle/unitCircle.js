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
}

class Point {
    constructor(x, y) {
		this.h = 1;
        this.x = x;
        this.y = y;
    }
    setPoint(x, y, h) {
        this.x = x;
        this.y = y;
        if (h != undefined)
            this.h = h;
    }
}

const Data = {
    pointsCtr: [],
    pointsSpline: [],
	pointsCircle: [],
	canvas: null,
	ctx: null,
    controlsParameters: {
		showCtrPoints: true,
        controlPolygon: false,
		spline: false,
        countSplinePoints: 10,
		circle: true,
		visualize: "points"
	},
    init: function (canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;

        //ЗАДАТЬ КОЛИЧЕСТВО КОНТРОЛЬНЫХ ТОЧЕК
        this.countCtrPoints = 0;

        this.setCountCtrPoints();
    },
    setCountCtrPoints: function () {
        this.pointsCtr = new Array(this.countCtrPoints);
        for (let i = 0; i < this.countCtrPoints; i++)
            this.pointsCtr[i] = new Point(0, 0);

        this.setCtrPoints();
    },
	fitCircleToScreen(x, y, center_x, center_y, rad) {
		const x1 = center_x + x * rad;
		const y1 = center_y + y * rad;
		return [x1, y1];
	},
    draw: function () {
        // Clear <canvas>
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		const center_x = this.canvas.width / 2;
		const center_y = this.canvas.height / 2;
		const radius = this.canvas.height / 2 - 50;

        if (this.controlsParameters.circle) {
			const [x, y] = this.fitCircleToScreen(0, 0, center_x, center_y, radius);
		
			this.ctx.strokeStyle = "blue";
			this.ctx.beginPath();
			this.ctx.arc(x, y, radius, 0, 2*Math.PI, false);
			this.ctx.stroke();
        }
		
        if (this.pointsCtr.length == 0)
            return;

        // Draw
        if (this.controlsParameters.showCtrPoints) {
			for (const point of this.pointsCtr) {
				this.ctx.fillStyle = "black";
				this.ctx.beginPath();
				const [x, y] = this.fitCircleToScreen(point.x, point.y, center_x, center_y, radius);
				this.ctx.arc(x, y, 5, 0, 2*Math.PI, false);
				this.ctx.fill();
			}
		}
        if (this.controlsParameters.controlPolygon) {		
			this.ctx.strokeStyle = "black";
			this.ctx.beginPath();
			for (let i=0; i<this.pointsCtr.length; i++) {
				const [x, y] = this.fitCircleToScreen(this.pointsCtr[i].x, this.pointsCtr[i].y, center_x, center_y, radius);
				if (i==0)
					this.ctx.moveTo(x, y);
				else
					this.ctx.lineTo(x, y);
			}
			this.ctx.stroke();
        }
        if (this.controlsParameters.spline) {
			switch (this.controlsParameters.visualize) {
            case "points":
				this.ctx.fillStyle = "red";
				for (const point of this.pointsSpline) {
					this.ctx.beginPath();
					const [x, y] = this.fitCircleToScreen(point.x, point.y, center_x, center_y, radius);
					this.ctx.arc(x, y, 3, 0, 2*Math.PI, false);
					this.ctx.fill();
				}
				break;
			case "line":
				this.ctx.strokeStyle = "red";
				this.ctx.beginPath();
				for (let i=0; i<this.pointsSpline.length; i++) {
					const [x, y] = this.fitCircleToScreen(this.pointsSpline[i].x, this.pointsSpline[i].y, center_x, center_y, radius);
					if (i==0)
						this.ctx.moveTo(x, y);
					else
						this.ctx.lineTo(x, y);
				}
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
        // ЗАДАТЬ КООРДИНАТЫ КОНТРОЛЬНЫХ ТОЧЕК
        //this.pointsCtr[0].setPoint(0, 1, 1);

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
    },
}

window.onload = main;