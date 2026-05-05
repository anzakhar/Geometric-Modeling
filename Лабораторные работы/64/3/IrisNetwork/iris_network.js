import {getShader} from './libs/prepShader.js';

const trainData = new Float32Array([5.1,2.5,3.0,1.1,5.8,2.7,3.9,1.2,5.4,3.0,4.5,1.5,6.2,2.8,4.8,1.8,6.1,2.6,5.6,1.4,6.7,3.0,5.2,2.3,6.0,2.9,4.5,1.5,4.3,3.0,1.1,0.1,4.7,3.2,1.3,0.2,6.5,3.0,5.2,2.0,7.2,3.2,6.0,1.8,6.3,3.3,4.7,1.6,6.9,3.1,5.4,2.1,6.0,3.4,4.5,1.6,5.5,2.4,3.8,1.1,7.4,2.8,6.1,1.9,6.3,3.4,5.6,2.4,6.5,2.8,4.6,1.5,7.3,2.9,6.3,1.8,5.1,3.4,1.5,0.2,5.4,3.9,1.7,0.4,5.2,2.7,3.9,1.4,6.9,3.2,5.7,2.3,5.5,2.3,4.0,1.3,6.0,3.0,4.8,1.8,5.6,2.7,4.2,1.3,5.6,2.8,4.9,2.0,6.8,2.8,4.8,1.4,6.9,3.1,4.9,1.5,7.2,3.6,6.1,2.5,6.3,2.5,4.9,1.5,5.9,3.0,4.2,1.5,6.7,3.3,5.7,2.1,5.7,3.0,4.2,1.2,6.4,2.9,4.3,1.3,5.0,3.2,1.2,0.2,5.0,3.4,1.5,0.2,6.2,2.2,4.5,1.5,5.9,3.2,4.8,1.8,5.6,3.0,4.1,1.3,5.4,3.9,1.3,0.4,5.0,3.0,1.6,0.2,5.9,3.0,5.1,1.8,5.0,2.3,3.3,1.0,6.4,2.8,5.6,2.2,4.8,3.0,1.4,0.1,5.4,3.7,1.5,0.2,6.4,3.2,5.3,2.3,4.6,3.6,1.0,0.2,5.0,3.5,1.3,0.3,4.8,3.4,1.9,0.2,6.3,2.7,4.9,1.8,6.3,2.8,5.1,1.5,5.2,3.5,1.5,0.2,6.1,2.8,4.0,1.3,6.7,3.1,4.7,1.5,6.0,2.7,5.1,1.6,5.1,3.5,1.4,0.2,5.5,4.2,1.4,0.2,6.5,3.0,5.5,1.8,4.4,2.9,1.4,0.2,7.9,3.8,6.4,2.0,6.4,2.8,5.6,2.1,6.9,3.1,5.1,2.3,5.0,3.4,1.6,0.4,6.0,2.2,5.0,1.5,6.1,2.9,4.7,1.4,5.6,2.9,3.6,1.3,4.5,2.3,1.3,0.3,5.7,2.8,4.1,1.3,5.2,4.1,1.5,0.1,6.1,2.8,4.7,1.2,6.8,3.0,5.5,2.1,6.1,3.0,4.9,1.8,5.8,2.8,5.1,2.4,5.5,2.6,4.4,1.2,4.9,3.1,1.5,0.1,6.5,3.0,5.8,2.2,5.8,2.7,5.1,1.9,4.6,3.2,1.4,0.2,6.6,2.9,4.6,1.3,6.3,2.3,4.4,1.3,6.3,2.9,5.6,1.8,4.9,3.0,1.4,0.2,5.7,2.9,4.2,1.3,5.0,3.6,1.4,0.2,7.7,3.0,6.1,2.3,7.2,3.0,5.8,1.6,6.2,3.4,5.4,2.3,5.1,3.8,1.6,0.2,6.0,2.2,4.0,1.0,6.4,3.2,4.5,1.5,5.5,2.5,4.0,1.3,5.6,2.5,3.9,1.1,5.0,3.5,1.6,0.6,6.7,3.1,5.6,2.4,7.0,3.2,4.7,1.4,6.7,2.5,5.8,1.8,5.4,3.4,1.7,0.2,4.9,2.5,4.5,1.7,6.4,3.1,5.5,1.8,5.8,2.7,5.1,1.9,4.8,3.0,1.4,0.3,6.6,3.0,4.4,1.4,4.8,3.4,1.6,0.2,6.2,2.9,4.3,1.3,5.5,3.5,1.3,0.2,5.7,2.8,4.5,1.3,4.8,3.1,1.6,0.2,5.8,4.0,1.2,0.2,6.3,3.3,6.0,2.5,5.4,3.4,1.5,0.4,4.9,3.1,1.5,0.1,4.4,3.0,1.3,0.2,5.1,3.8,1.9,0.4,4.7,3.2,1.6,0.2,5.0,3.3,1.4,0.2,5.1,3.5,1.4,0.3,5.8,2.7,4.1,1.0,5.3,3.7,1.5,0.2,6.8,3.2,5.9,2.3,5.1,3.7,1.5,0.4,7.7,2.6,6.9,2.3,5.7,4.4,1.5,0.4,5.7,2.6,3.5,1.0,7.7,3.8,6.7,2.2,5.7,3.8,1.7,0.3,7.1,3.0,5.9,2.1,4.9,3.1,1.5,0.1,7.6,3.0,6.6,2.1,6.3,2.5,5.0,1.9,5.7,2.5,5.0,2.0,5.0,2.0,3.5,1.0,6.5,3.2,5.1,2.0,4.9,2.4,3.3,1.0,5.6,3.0,4.5,1.5,4.4,3.2,1.3,0.2,5.1,3.8,1.5,0.3,5.8,2.6,4.0,1.2,5.2,3.4,1.4,0.2,5.5,2.4,3.7,1.0,6.7,3.3,5.7,2.5,6.4,2.7,5.3,1.9,5.1,3.3,1.7,0.5]);

const trainResults = new Float32Array([0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,0.0]);

const testData = new Float32Array([4.6,3.4,1.4,0.3,4.6,3.1,1.5,0.2,7.7,2.8,6.7,2.0,6.1,3.0,4.6,1.4,6.7,3.1,4.4,1.4,6.7,3.0,5.0,1.7]);

const testResults = new Float32Array([1.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0]);

// Create top-level asynchronous function
async function runExample() {

// Read shaders.
const computeLoss = await getShader("shaders.wgsl");

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

// Define constants
const batchSize = 16;
const nodesPerLayer = 4;
const groupSize = batchSize * nodesPerLayer;
const numInputs = 4;
const layer1Size = 4;
const layer2Size = 4;
const layer3Size = 3;
const numTrainPoints = Math.trunc(trainData.length/numInputs);
const numTestPoints = Math.trunc(testData.length/numInputs);
const numWeights = layer1Size * numInputs + layer2Size * layer1Size + layer3Size * layer2Size;
const numBias = layer1Size + layer2Size + layer3Size;
const numEpochs = 150;
const eta = 0.001;

// Store training data
const trainDataBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: trainData.length * 4,
    usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC
});
const trainDataRange = trainDataBuffer.getMappedRange();
new Float32Array(trainDataRange).set(trainData);
trainDataBuffer.unmap();

// Store training results
const trainResultBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: trainResults.length * 4,
    usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC
});
const trainResultsRange = trainResultBuffer.getMappedRange();
new Float32Array(trainResultsRange).set(trainResults);
trainResultBuffer.unmap();

// Store node weights
const sigma = Math.sqrt(2.0/numInputs);
const weightBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: numWeights * 4,
    usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC
});

// Generate and store weights
const weightData = new Array(numWeights);
for (let i = 0; i < numWeights; i+= 2) {
    let x1 = Math.random();
    let x2 = Math.random();
    weightData[i] = Math.sqrt(-2.0 * Math.log(x1)) * Math.cos(2 * Math.PI * x2) * sigma;
    weightData[i + 1] = Math.sqrt(-2.0 * Math.log(x1)) * Math.sin(2 * Math.PI * x2) * sigma;
}
const weightRange = weightBuffer.getMappedRange();
new Float32Array(weightRange).set(weightData);
weightBuffer.unmap();

// Store bias weights
let biasWeightData =  new Array(numBias).fill(0.0);
const biasWeightBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: numBias * 4,
    usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC
});
const biasWeightRange = biasWeightBuffer.getMappedRange();
new Float32Array(biasWeightRange).set(biasWeightData);
biasWeightBuffer.unmap();

// Store test data
const testDataBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: testData.length * 4,
    usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC
});
const testDataRange = testDataBuffer.getMappedRange();
new Float32Array(testDataRange).set(testData);
testDataBuffer.unmap();

// Store test results computed by the GPU
let testResultData =  new Array(numTestPoints * 3).fill(0.0);
const testResultBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: numTestPoints * 3 * 4,
    usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC
});
const testResultRange = testResultBuffer.getMappedRange();
new Float32Array(testResultRange).set(testResultData);
testResultBuffer.unmap();

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
    }, {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" }
    }, {
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" }
    }, {
        binding: 5,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" }
    }]
});

// Create the bind group
let bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{
        binding: 0,
        resource: { buffer: trainDataBuffer }
    },
    {
        binding: 1,
        resource: { buffer: trainResultBuffer }
    },
    {
        binding: 2,
        resource: { buffer: weightBuffer }
    },
    {
        binding: 3,
        resource: { buffer: biasWeightBuffer }
    },
    {
        binding: 4,
        resource: { buffer: testDataBuffer }
    },
    {
        binding: 5,
        resource: { buffer: testResultBuffer }
    }]
});

// Create the pipeline layout
const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [ bindGroupLayout ]
});

// Create the shader module for the computeLoss shader
const computeLossModule = device.createShaderModule({
    code: computeLoss
});

// Create the compute pass encoder
const computePass = encoder.beginComputePass({
    label: "Compute Pass 0"
});

// Define the compute procedure
const computePipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: {
        module: computeLossModule,
        entryPoint: "computeMain",
        constants: {
            group_size: groupSize,
            batch_size: batchSize,
            num_train_points: numTrainPoints,
            num_test_points: numTestPoints,
            num_inputs: numInputs,
            l1_size: layer1Size,
            l2_size: layer2Size,
            l3_size: layer3Size,
            num_weights: numWeights,
            num_bias: numBias,
            num_epochs: numEpochs,
            eta: eta
        }
    }
});

computePass.setPipeline(computePipeline);
computePass.setBindGroup(0, bindGroup);

// Encode compute commands
computePass.dispatchWorkgroups(1);

// Complete encoding compute commands
computePass.end();

// Create mappable buffer
const mappableBuffer = device.createBuffer({
    size: numTestPoints * 3 * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
});

// Encode copy command
encoder.copyBufferToBuffer(testResultBuffer, 0, mappableBuffer, 0, numTestPoints * 3 * 4);

// Submit the commands to the GPU
device.queue.submit([encoder.finish()]);

// Read data from compute buffer
await mappableBuffer.mapAsync(GPUMapMode.READ);
const procData = mappableBuffer.getMappedRange();
const floatData = new Float32Array(procData);

let msg = "";
for (let test = 0; test < numTestPoints; test++) {
    
    // Actual values
    let max_value = -999.0;
    let max_actual_index = -1;
    msg = msg.concat("Actual classification:&nbsp;&nbsp;");
    for (let i = 0; i < 3; i++) {
        msg = msg.concat(parseFloat(testResults[test * 3 + i]).toFixed(3)).concat(" ");
        if(testResults[test * 3 + i] > max_value) {
            max_value = testResults[test * 3 + i];
            max_actual_index = i;
        }
    }
    msg = msg.concat("<br />");
    
    // Actual values
    max_value = -999.0;
    let max_computed_index = -1;
    msg = msg.concat("Computed outputs:&nbsp;&nbsp;&nbsp;&nbsp;");
    for (let i = 0; i < 3; i++) {
        msg = msg.concat(parseFloat(floatData[test * 3 + i]).toFixed(3)).concat(" ");
        if(floatData[test * 3 + i] > max_value) {
            max_value = testResults[test * 3 + i];
            max_computed_index = i;
        }
    }
    msg = msg.concat("<br />");
    
    // Display result
    if(max_actual_index == max_computed_index) {
        msg = msg.concat("Result: SUCCESS");
    } else {
        msg = msg.concat("Result: FAILURE");
    }
    msg = msg.concat("<br /><br />");
}

// Update label in page
document.getElementById("results").innerHTML = msg;

// Destroy the mapping
mappableBuffer.unmap();
}

// Run example function
runExample();