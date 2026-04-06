// Imports.
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

// Create compute buffer
const matrixDim = 64;
const buffSize = matrixDim * matrixDim * 4;
const groupSize = [(matrixDim/4) * (matrixDim/4 + 1)]/2;

const computeBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: buffSize,
    usage: 
        GPUBufferUsage.STORAGE | 
        GPUBufferUsage.COPY_SRC
});

// Access the mapped data
const buff = computeBuffer.getMappedRange();

// Set the content of the mapped data
const inputVals = new Array(matrixDim * matrixDim);
for(let i = 0; i < matrixDim; i++) {
    for(let j = 0; j < matrixDim; j++) {
        inputVals[i*matrixDim + j] = 1.0 * i * matrixDim + j;
    }
}
new Float32Array(buff).set(inputVals);

// Unmap buffer
computeBuffer.unmap();

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
            block_dim: matrixDim/4,
            group_size: groupSize
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
        resource: { buffer: computeBuffer }
    }]
});
computePass.setBindGroup(0, bindGroup);

// Encode compute commands
computePass.dispatchWorkgroups(1);

// Complete encoding compute commands
computePass.end();

// Create mappable buffer
const mappableBuffer = device.createBuffer({
  size: buffSize,
  usage: 
      GPUBufferUsage.COPY_DST | 
      GPUBufferUsage.MAP_READ
});

// Encode copy command
encoder.copyBufferToBuffer(computeBuffer, 0, mappableBuffer, 0, buffSize);

// Submit the commands to the GPU
device.queue.submit([encoder.finish()]);

// Read data from compute buffer
await mappableBuffer.mapAsync(GPUMapMode.READ);
const procData = mappableBuffer.getMappedRange();
const floatData = new Float32Array(procData);

// Check result
let checkMat = true;
for(let i = 0; i < matrixDim; i++) {
    for(let j = 0; j < matrixDim; j++) {
        if (floatData[i*matrixDim + j] != 1.0 * j * matrixDim + i) {
            checkMat = false;
        }
    }
}

// Display output in page
const outputMsg = checkMat ? "Transpose check passed" : "Transpose check failed";
document.getElementById("output").innerHTML = outputMsg;

// Destroy the mapping
mappableBuffer.unmap();
}

// Run example function
runExample();