// 1.js

// Imports.
import * as  dat from './libs/dat.gui.module.js';
import {EventUtil} from './libs/EventUtil.js';
import {getShader} from './libs/prepShader.js';

async function main() {
    // Retrieve <canvas> element
    const canvas = document.getElementById('mycanvas');
	canvas.width  = document.documentElement.clientWidth;
	canvas.height = document.documentElement.clientHeight;

    // Get the rendering context for 2DCG
    const ctx = canvas.getContext('2d');

    // Read shaders.
    const shaderCode = await getShader("shaders.wgsl");

    // Check if WebGPU is supported
    if (!navigator.gpu) {
        throw new Error("WebGPU not supported");
    }
	
	const gui = new dat.GUI();;
	
	const guiCtrPointsParams = gui.addFolder('Control point parameters');
	const guiSplineParams = gui.addFolder('Spline parameters');
	const guiCircleParams = gui.addFolder('Circle parameters');
	
	guiCtrPointsParams.add(Data.controlsParameters, 'showCtrPoints').onChange(function (e) { Data.draw(); });
	guiCtrPointsParams.add(Data.controlsParameters, 'controlPolygon').onChange(function (e) { Data.draw(); });
	
	guiSplineParams.add(Data.controlsParameters, 'spline').onChange(function (e) { Data.calculateSplineAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'countSplinePoints', 1, 7e6, 1).onChange(function (e) { Data.calculateSplineAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'visualize', ["points", "line"]).onChange(function (e) { Data.draw(); });

    Data.init(canvas, ctx, shaderCode);
	
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
    shaderCode: null,
    controlsParameters: {
		showCtrPoints: true,
        controlPolygon: false,
		spline: false,
        countSplinePoints: 10,
		circle: true,
		visualize: "points"
	},
    init: function (canvas, ctx, shaderCode) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.shaderCode = shaderCode;

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
    calculateSplineAndDraw: async function () {
		if (this.controlsParameters.spline)
			await this.calculateSpline();
        
        this.draw();
    },
    setCtrPoints: function () {
        // ЗАДАТЬ КООРДИНАТЫ КОНТРОЛЬНЫХ ТОЧЕК
        //this.pointsCtr[0].setPoint(0, 1, 1);

        this.draw();
    },
    calculateSpline: async function () {
		let pt;
        let t, x, y, dt;
		
        const N = this.controlsParameters.countSplinePoints;

        const tgpu1 = Date.now();
        // Access the GPUAdapter
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("No GPUAdapter found");
        }

        // Check for timestamp support
        const timeSupport = adapter.features.has("timestamp-query");

        // Access the GPU
        const device = timeSupport ?
            await adapter.requestDevice({ 
                requiredFeatures: ["timestamp-query"] }) :
            await adapter.requestDevice();
        if (!device) {
            throw new Error("Failed to create a GPUDevice");
        }

        // Create the command encoder
        const encoder = device.createCommandEncoder();
        if (!encoder) {
            throw new Error("Failed to create a GPUCommandEncoder");
        }

        // Create the query set
        const querySet = timeSupport ?
            device.createQuerySet({
                label: "Query Set",
                count: 2,
                type: "timestamp"
            }) : None;

        // Create the query buffer
        const queryBuffer = timeSupport ?
            device.createBuffer({
                size: querySet.count * BigInt64Array.BYTES_PER_ELEMENT,
                usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
            }) : None

        // Create compute buffers
        const pointsCtrBuffer = device.createBuffer({
            mappedAtCreation: true,
            // ЗАДАТЬ РАЗМЕР БУФЕРА КОНТРОЛЬНЫХ ТОЧЕК <SIZE_1>
            size: 4 * SIZE_1,
            usage:
                GPUBufferUsage.STORAGE
        });
        const pointsCtrRange = pointsCtrBuffer.getMappedRange();

        // Create compute buffers
        const pointsSplineBuffer = device.createBuffer({
            mappedAtCreation: true,
            // ЗАДАТЬ РАЗМЕР БУФЕРА ТОЧЕК СПЛАЙНА <SIZE_2>
            size: 4 * SIZE_2,
            usage:
                GPUBufferUsage.STORAGE |
                GPUBufferUsage.COPY_SRC
        });
        const pointsSplineRange = pointsSplineBuffer.getMappedRange();

        // Create the data arrays
        // ЗАДАТЬ РАЗМЕР МАССИВА КОНТРОЛЬНЫХ ТОЧЕК <SIZE_3>
        const pointsCtrArray = new Array(SIZE_3);
        // ЗАДАТЬ РАЗМЕР МАССИВА ТОЧЕК СПЛАЙНА <SIZE_4>
        const pointsSplineArray = new Array(SIZE_4);

        // ЗАПОЛНИТЬ МАССИВ КОНТРОЛЬНЫХ ТОЧЕК pointsCtrArray
        // pointsSplineArray[i] = this.pointsCtr[i].x;

        pointsSplineArray.fill(0.0);

        // Create arrays in buffer memory
        new Float32Array(pointsCtrRange).set(pointsCtrArray);
        new Float32Array(pointsSplineRange).set(pointsSplineArray);

        // Unmap buffers
        pointsCtrBuffer.unmap();
        pointsSplineBuffer.unmap();

        // Create the shader module
        const shaderModule = device.createShaderModule({
            label: "Shader module 0",
            code: this.shaderCode
        });

        // Create the compute pass encoder
        const computePass = timeSupport ?
            encoder.beginComputePass({
                timestampWrites: {
                    querySet,
                    beginningOfPassWriteIndex: 0,
                    endOfPassWriteIndex: 1
                }}) :
            encoder.beginComputePass({});

        // Define the compute procedure
        const computePipeline = device.createComputePipeline({
            label: "Compute Pipeline 0",
            layout: "auto",
            compute: {
                module: shaderModule,
                entryPoint: "computeMain",
                constants: {
                    group_size: 256,
                    // ПЕРЕДАТЬ НЕОБХОДИМЫЕ КОНСТАНТЫ В ШЕЙДЕР
                }
            }
        });

        // Associate the pipeline with the compute pass encoder
        computePass.setPipeline(computePipeline);

        // Access the bind group layout
        const bindGroupLayout = computePipeline.getBindGroupLayout(0);

        // Create the bind group
        let bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: pointsCtrBuffer }
            },
            {
                binding: 1,
                resource: { buffer: pointsSplineBuffer }
            }]
        });
        computePass.setBindGroup(0, bindGroup);

        // Encode compute commands
        // ЗАДАТЬ <SIZE_5>
        computePass.dispatchWorkgroups(SIZE_5);

        // Complete encoding compute commands
        computePass.end();

        // Create buffer to hold timestamp results
        const tsBuffer = timeSupport ?
            device.createBuffer({
                size: querySet.count * BigInt64Array.BYTES_PER_ELEMENT,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            }) : None;

        if (timeSupport) {
            
            // Encode timestamp query command
            encoder.resolveQuerySet(querySet,
                0, querySet.count, queryBuffer, 0);
            
            // Encode command to copy timestamp data
            encoder.copyBufferToBuffer(queryBuffer, 0, tsBuffer, 0, 
                querySet.count * BigInt64Array.BYTES_PER_ELEMENT);
        }

        // Create mappable buffer for spline points
        const mappableBuffer = device.createBuffer({
        // ОПРЕДЕЛИТЬ <SIZE_5>
        size: SIZE_5,
        usage:
            GPUBufferUsage.COPY_DST |
            GPUBufferUsage.MAP_READ
        });

        // Encode copy command for spline points
        // ОПРЕДЕЛИТЬ <SIZE_6>
        encoder.copyBufferToBuffer(pointsSplineBuffer, 0, mappableBuffer, 0, SIZE_6);

        // Submit the commands to the GPU
        device.queue.submit([encoder.finish()]);

        // Read data from compute buffer
        await mappableBuffer.mapAsync(GPUMapMode.READ);
        const procData = mappableBuffer.getMappedRange();
        const resData = new Float32Array(procData);

        this.pointsSpline = new Array(N);

        // СЧИТАТЬ РАССЧИТАННЫЕ ДАННЫЕ
        // x = resData[0];
        // y = resData[1];
        // pt = new Point(x, y);
        // this.pointsSpline[j]=pt;

        const tgpu2 = Date.now();

        // Destroy the mapping
        mappableBuffer.unmap();

        if (timeSupport) {
            
            // Read data from compute buffer
            await tsBuffer.mapAsync(GPUMapMode.READ);
            const mapData = tsBuffer.getMappedRange();
            const tsData = new BigInt64Array(mapData);
            
            // Display output in page
            const t1 = Number(tsData[0]) / 1000000.0;
            const t2 = Number(tsData[1]) / 1000000.0;    
            const t = t2 - t1;
            const tsMsg = "Time: ".concat(t2.toString()).concat(" - ").concat(t1.toString()).concat(" = ");
            console.log(tsMsg.concat(t.toString()));
           
            // Destroy the mapping
            tsBuffer.unmap();
        }

        // РАСЧЕТ КООРДИНАТ ТОЧКИ СПЛАЙНА

        //pt = new Point(x, y);
        //this.pointsSpline[j]=pt;
    },
}

window.onload = main;