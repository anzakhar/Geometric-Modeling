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

// Create buffer containing x vector
const xBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: 16,
    usage: 
        GPUBufferUsage.STORAGE | 
        GPUBufferUsage.COPY_SRC
});
const xRange = xBuffer.getMappedRange();
const x = [1.0, 2.0, 3.0, 4.0];
new Float32Array(xRange).set(x);
xBuffer.unmap();

// Create buffer containing u vector
const uBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: 16,
    usage: 
        GPUBufferUsage.STORAGE | 
        GPUBufferUsage.COPY_SRC
});
const uRange = uBuffer.getMappedRange();
const u = [0.0, 5.0, 0.0, 0.0];
new Float32Array(uRange).set(u);
uBuffer.unmap();

// Create buffer containing x'
const xprimeBuffer = device.createBuffer({
    size: 16,
    usage: 
        GPUBufferUsage.STORAGE | 
        GPUBufferUsage.COPY_SRC
});

// Update label in page
const xMsg = "x vector: ";
document.getElementById("xVector").innerHTML = xMsg.concat(x.toString());

// Update label in page
const uMsg = "u vector: ";
document.getElementById("uVector").innerHTML = uMsg.concat(u.toString());

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
            group_size: 1
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
        resource: { buffer: xBuffer }
    },
    {
        binding: 1,
        resource: { buffer: uBuffer }
    },
    {
        binding: 2,
        resource: { buffer: xprimeBuffer }
    }]
});
computePass.setBindGroup(0, bindGroup);

// Encode compute commands
computePass.dispatchWorkgroups(8);

// Complete encoding compute commands
computePass.end();

// Create mappable buffer
const mappableBuffer = device.createBuffer({
  size: 16,
  usage: 
      GPUBufferUsage.COPY_DST | 
      GPUBufferUsage.MAP_READ
});

// Encode copy command
encoder.copyBufferToBuffer(xprimeBuffer, 0, mappableBuffer, 0, 16);

// Submit the commands to the GPU
device.queue.submit([encoder.finish()]);

// Read data from compute buffer
await mappableBuffer.mapAsync(GPUMapMode.READ);
const procData = mappableBuffer.getMappedRange();
const floatData = new Float32Array(procData);

// Display output in page
const xprimeMsg = "reflected vector: ";
document.getElementById("reflectVector").innerHTML = xprimeMsg.concat(floatData.toString());

// Destroy the mapping
mappableBuffer.unmap();
}

// Run example function
runExample();