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
const matrixDim = 32;
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
        aMatrix[i*matrixDim + j] = Math.random() * 1000;
    }
}
new Float32Array(aRange).set(aMatrix);
aBuffer.unmap();

// Create buffer containing Q matrix
const qBuffer = device.createBuffer({
    size: buffSize,
    usage: 
        GPUBufferUsage.STORAGE | 
        GPUBufferUsage.COPY_SRC
});

// Create buffer containing R matrix
const pBuffer = device.createBuffer({
    size: buffSize,
    usage: GPUBufferUsage.STORAGE
});

// Create buffer containing check matrix
const prodBuffer = device.createBuffer({
    size: buffSize,
    usage: 
        GPUBufferUsage.STORAGE
});

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
        resource: { buffer: qBuffer }
    },
    {
        binding: 2,
        resource: { buffer: pBuffer }
    },
    {
        binding: 3,
        resource: { buffer: prodBuffer }
    }]
});
computePass.setBindGroup(0, bindGroup);

// Encode compute commands
computePass.dispatchWorkgroups(1);

// Complete encoding compute commands
computePass.end();

// Create mappable buffer for Q matrix
const mappableBufferQ = device.createBuffer({
  size: buffSize,
  usage: 
      GPUBufferUsage.COPY_DST | 
      GPUBufferUsage.MAP_READ
});

// Create mappable buffer for R matrix
const mappableBufferR = device.createBuffer({
  size: buffSize,
  usage: 
      GPUBufferUsage.COPY_DST | 
      GPUBufferUsage.MAP_READ
});

// Encode copy commands
encoder.copyBufferToBuffer(qBuffer, 0, mappableBufferQ, 0, buffSize);
encoder.copyBufferToBuffer(aBuffer, 0, mappableBufferR, 0, buffSize);

// Submit the commands to the GPU
device.queue.submit([encoder.finish()]);

// Read data from Q buffer
await mappableBufferQ.mapAsync(GPUMapMode.READ);
const procDataQ = mappableBufferQ.getMappedRange();
const floatDataQ = new Float32Array(procDataQ);

// Read data from A buffer (now contains the R matrix)
await mappableBufferR.mapAsync(GPUMapMode.READ);
const procDataR = mappableBufferR.getMappedRange();
const floatDataR = new Float32Array(procDataR);

// Compute product of Q and R
const checkMatrix = new Array(matrixDim * matrixDim);
for(let i = 0; i < matrixDim; i++) {
    for(let j = 0; j < matrixDim; j++) {
        let product = 0.0;
        for(let k = 0; k < matrixDim; k++) {
            product += floatDataQ[i*matrixDim + k] * floatDataR[k*matrixDim + j];
        }
        checkMatrix[i*matrixDim + j] = product;
    }
}

// Check that A = QR
let checkMat = true;
for(let i = 0; i < matrixDim; i++) {
    for(let j = 0; j < matrixDim; j++) {
        if (Math.abs(checkMatrix[i*matrixDim + j] - aMatrix[i*matrixDim + j]) > 0.01) {
            checkMat = false;
        }
    }
}

// Display output in page
const outputMsg = checkMat ? "Factorization check passed" : "Factorization check failed";
document.getElementById("output").innerHTML = outputMsg;

// Destroy the mapping
mappableBufferQ.unmap();
mappableBufferR.unmap();
}

// Run example function
runExample();