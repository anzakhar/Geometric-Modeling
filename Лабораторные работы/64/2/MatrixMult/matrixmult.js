// Imports.
import {getShader} from './libs/prepShader.js';

// Create top-level asynchronous function
async function runExample() {

const multCode = await getShader("shader_mult.wgsl");
const transposeCode = await getShader("shader_trans.wgsl");

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

// Set parameters
const matrixDim = 16;
const buffSize = matrixDim * matrixDim * 4;
const groupSize = [(matrixDim/4) * (matrixDim/4 + 1)]/2;

// Create buffers
const aBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: buffSize,
    usage: 
        GPUBufferUsage.STORAGE | 
        GPUBufferUsage.COPY_SRC
});
const bBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: buffSize,
    usage: 
        GPUBufferUsage.STORAGE | 
        GPUBufferUsage.COPY_SRC
});
const cBuffer = device.createBuffer({
    size: buffSize,
    usage: 
        GPUBufferUsage.STORAGE | 
        GPUBufferUsage.COPY_SRC
});

// Access the mapped data
const aRange = aBuffer.getMappedRange();
const bRange = bBuffer.getMappedRange();

// Set the content of the mapped data
const inputVals = new Array(matrixDim * matrixDim);
for(let i = 0; i < matrixDim; i++) {
    for(let j = 0; j < matrixDim; j++) {
        inputVals[i*matrixDim + j] = 1.0 * i * matrixDim + j;
    }
}
new Float32Array(aRange).set(inputVals);
new Float32Array(bRange).set(inputVals);

// Unmap buffer
aBuffer.unmap();
bBuffer.unmap();

// Create the command encoder
const transposeEncoder = device.createCommandEncoder();
if (!transposeEncoder) {
    throw new Error("Failed to create a GPUCommandEncoder");
}

// Create the shader module
const transposeModule = device.createShaderModule({
    label: "Shader module 0",
    code: transposeCode
});

// Create the compute pass encoder
const transposePass = transposeEncoder.beginComputePass({
    label: "Compute Pass 0"
});

// Create the bind group layout
const bindGroupLayout = device.createBindGroupLayout({
    entries: [{
        binding: 0, 
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
    }, {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
    }, {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" }
    }]
});

// Create the bind group
let bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{
        binding: 0,
        resource: { buffer: aBuffer }
    },
    {
        binding: 1,
        resource: { buffer: bBuffer }
    },
    {
        binding: 2,
        resource: { buffer: cBuffer }
    }]
});
transposePass.setBindGroup(0, bindGroup);

const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [ bindGroupLayout ]
});

// Define the compute procedure
const transposePipeline = device.createComputePipeline({
    label: "Compute Pipeline 0",
    layout: pipelineLayout,
    compute: {
        module: transposeModule,
        entryPoint: "computeMain",
        constants: {
            block_dim: matrixDim/4,
            group_size: groupSize
        }
    }   
});
transposePass.setPipeline(transposePipeline);

// Encode compute commands
transposePass.dispatchWorkgroups(1);

// Complete encoding compute commands
transposePass.end();

// Submit the commands to the GPU
device.queue.submit([transposeEncoder.finish()]);

// Re-create the command encoder
const multEncoder = device.createCommandEncoder();
if (!multEncoder) {
    throw new Error("Failed to create a GPUCommandEncoder");
}

// Create the shader module for matrix multiplication
const multModule = device.createShaderModule({
    label: "Shader module 1",
    code: multCode
});

// Create the compute pass encoder
const multPass = multEncoder.beginComputePass({
    label: "Compute Pass 1"
});

// Define the compute procedure
const multPipeline = device.createComputePipeline({
    label: "Compute Pipeline 1",
    layout: pipelineLayout,
    compute: {
        module: multModule,
        entryPoint: "computeMain",
        constants: {
            vectors_per_row: matrixDim/4,
            group_size_x: matrixDim,
            group_size_y: matrixDim
        }
    }
});
multPass.setPipeline(multPipeline);
multPass.setBindGroup(0, bindGroup);

// Encode compute commands
multPass.dispatchWorkgroups(1, 1);

// Complete encoding compute commands
multPass.end();

// Create mappable buffer
const mappableBuffer = device.createBuffer({
  size: buffSize,
  usage: 
      GPUBufferUsage.COPY_DST | 
      GPUBufferUsage.MAP_READ
});

// Encode copy command
multEncoder.copyBufferToBuffer(cBuffer, 0, mappableBuffer, 0, buffSize);

// Submit the commands to the GPU
device.queue.submit([multEncoder.finish()]);

// Read data from compute buffer
await mappableBuffer.mapAsync(GPUMapMode.READ);
const procData = mappableBuffer.getMappedRange();
const floatData = new Float32Array(procData);

// Check multiplication result
let checkMat = true;
let sum = 0.0;
for(let i = 0; i < matrixDim; i++) {
    for(let j = 0; j < matrixDim; j++) {
        sum = 0.0;
        for(let k = 0; k < matrixDim; k++) {
            sum += inputVals[i*matrixDim + k] * inputVals[k*matrixDim + j];
        }
        if (floatData[i*matrixDim + j] != sum) {
            checkMat = false;
        }
    }
}

// Display output in page
const outputMsg = checkMat ? "Multiplication check passed" : "Multiplication check failed";
document.getElementById("output").innerHTML = outputMsg;

// Destroy the mapping
mappableBuffer.unmap();
}

// Run example function
runExample();