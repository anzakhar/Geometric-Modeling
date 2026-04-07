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

// Check for timestamp support
const timeSupport = adapter.features.has("timestamp-query");

// Access the client's GPU
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

// Set parameters
const matrixDim = 16;
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

// Create mappable buffer for b vector
const mappableBufferB = device.createBuffer({
  size: matrixDim * 4,
  usage: 
      GPUBufferUsage.COPY_DST | 
      GPUBufferUsage.MAP_READ
});

// Encode copy commands
encoder.copyBufferToBuffer(xBuffer, 0, mappableBufferX, 0, matrixDim * 4);
encoder.copyBufferToBuffer(aBuffer, 0, mappableBufferA, 0, buffSize);
encoder.copyBufferToBuffer(bBuffer, 0, mappableBufferB, 0, matrixDim * 4);

// Submit the commands to the GPU
device.queue.submit([encoder.finish()]);

// Read data from A buffer
await mappableBufferA.mapAsync(GPUMapMode.READ);
const dataA = mappableBufferA.getMappedRange();
const floatDataA = new Float32Array(dataA);

// Read data from b buffer
await mappableBufferB.mapAsync(GPUMapMode.READ);
const dataB = mappableBufferB.getMappedRange();
const floatDataB = new Float32Array(dataB);

console.log(floatDataA, floatDataB);

// Read data from x buffer
await mappableBufferX.mapAsync(GPUMapMode.READ);
const dataX = mappableBufferX.getMappedRange();
const floatDataX = new Float32Array(dataX);

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
    document.getElementById("timestamp").innerHTML = tsMsg.concat(t.toString());
    
    // Destroy the mapping
    tsBuffer.unmap();
}

// Destroy the mapping
mappableBufferA.unmap();
mappableBufferB.unmap();
mappableBufferX.unmap();
}

// Run example function
runExample();