import {getShader} from './libs/prepShader.js';

// Create top-level asynchronous function
async function runExample() {

// Read shaders.
const shaderCode = await getShader("shaders.wgsl");

// Check if WebGPU is supported
if (!navigator.gpu) {
    throw new Error("WebGPU not supported");
}

// Access the GPUAdapter
const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
    throw new Error("No GPUAdapter found");
}

// Access the client's GPU
const device = await adapter.requestDevice();
if (!device) {
    throw new Error("Failed to create a GPUDevice");
}

// Create the command encoder
const encoder = device.createCommandEncoder();
if (!encoder) {
    throw new Error("Failed to create a GPUCommandEncoder");
}

// Set parameters
const matrixDim = 3;
const buffSize = matrixDim * matrixDim * 4;

// Create buffer containing A matrix
const aBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: buffSize,
    usage: 
        GPUBufferUsage.STORAGE | 
        GPUBufferUsage.COPY_SRC
});
const aRange = aBuffer.getMappedRange();
const aMatrix = new Array(matrixDim * matrixDim);
for(let i = 0; i < matrixDim; i++) {
    for(let j = 0; j < matrixDim; j++) {
        aMatrix[i*matrixDim + j] = Math.random() * 10;
    }
}
new Float32Array(aRange).set(aMatrix);
aBuffer.unmap();

// Create buffer containing x vector
const xBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: matrixDim * 4,
    usage: 
        GPUBufferUsage.STORAGE | 
        GPUBufferUsage.COPY_SRC
});
const xRange = xBuffer.getMappedRange();
const xVector = new Array(matrixDim);
for(let i = 0; i < matrixDim; i++) {
    xVector[i] = Math.random() * 10;
}
new Float32Array(xRange).set(xVector);
xBuffer.unmap();

// Create buffer containing b vector
const bBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: matrixDim * 4,
    usage: 
        GPUBufferUsage.STORAGE | 
        GPUBufferUsage.COPY_SRC
});
const bRange = bBuffer.getMappedRange();
const bVector = new Array(matrixDim);
for(let i = 0; i < matrixDim; i++) {
    bVector[i] = 0;
    for(let j = 0; j < matrixDim; j++) {
        bVector[i] += aMatrix[i*matrixDim + j] * xVector[j];
    }
}
new Float32Array(bRange).set(bVector);
bBuffer.unmap();

// Create the shader module
const shaderModule = device.createShaderModule({
    label: "Shader module 0",
    code: shaderCode
});

// Create the compute pass encoder
const computePass = encoder.beginComputePass({
    label: "Compute Pass 0"
});

// Define the compute procedure
const computePipeline = device.createComputePipeline({
    label: "Compute Pipeline 0",
    layout: "auto",
    compute: {
        module: shaderModule,
        entryPoint: "computeMain",
        constants: {
            matrix_dim: matrixDim
        }
    }   
});
computePass.setPipeline(computePipeline);

// Access the bind group layout
const bindGroupLayout = computePipeline.getBindGroupLayout(0);

// Create the bind group
let bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{
        binding: 0,
        resource: { buffer: aBuffer }
    },
    {
        binding: 1,
        resource: { buffer: xBuffer }
    },
    {
        binding: 2,
        resource: { buffer: bBuffer }
    }]
});
computePass.setBindGroup(0, bindGroup);

// Encode compute commands
computePass.dispatchWorkgroups(1);

// Complete encoding compute commands
computePass.end();

// Create mappable buffer for x vector
const mappableBufferX = device.createBuffer({
  size: matrixDim * 4,
  usage: 
      GPUBufferUsage.COPY_DST | 
      GPUBufferUsage.MAP_READ
});

// Create mappable buffer for Q matrix
const mappableBufferA = device.createBuffer({
  size: buffSize,
  usage: 
      GPUBufferUsage.COPY_DST | 
      GPUBufferUsage.MAP_READ
});

// Encode copy commands
encoder.copyBufferToBuffer(xBuffer, 0, mappableBufferX, 0, matrixDim * 4);
encoder.copyBufferToBuffer(aBuffer, 0, mappableBufferA, 0, buffSize);

// Submit the commands to the GPU
device.queue.submit([encoder.finish()]);

// Read data from A buffer
await mappableBufferA.mapAsync(GPUMapMode.READ);
const dataA = mappableBufferA.getMappedRange();
const floatDataA = new Float32Array(dataA);

console.log(floatDataA);

// Read data from x buffer
await mappableBufferX.mapAsync(GPUMapMode.READ);
const dataX = mappableBufferX.getMappedRange();
const floatDataX = new Float32Array(dataX);

// // Read data from A buffer (now contains the R matrix)
// await mappableBufferR.mapAsync(GPUMapMode.READ);
// const procDataR = mappableBufferR.getMappedRange();
// const floatDataR = new Float32Array(procDataR);

// Check that Ax - b = 0
let checkMat = true;
let sum;
const checkMatrix = new Array(matrixDim * matrixDim);
for(let i = 0; i < matrixDim; i++) {
    sum = 0;
    for(let j = 0; j < matrixDim; j++) {
        sum += aMatrix[i*matrixDim + j] * floatDataX[j];
    }
    if (Math.abs(sum - bVector[i]) > 0.01) {
        checkMat = false;
    }
}

// Display output in page
const outputMsg = checkMat ? "Gauss solver check passed" : "Gauss solver check failed";
document.getElementById("output").innerHTML = outputMsg;

// Destroy the mapping
mappableBufferX.unmap();
mappableBufferA.unmap();
}

// Run example function
runExample();