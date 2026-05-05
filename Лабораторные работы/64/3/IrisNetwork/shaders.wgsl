// Training data
@binding(0) @group(0) var<storage, read_write> train_data : array<f32>;

// Training results
@binding(1) @group(0) var<storage, read_write> train_results : array<vec4f>;

// Weights
@binding(2) @group(0) var<storage, read_write> weights : array<f32>;

// Bias weights
@binding(3) @group(0) var<storage, read_write> bias_weights : array<f32>;

// Test data
@binding(4) @group(0) var<storage, read_write> test_data : array<f32>;

// Test results
@binding(5) @group(0) var<storage, read_write> test_results : array<f32>;

override group_size: u32;
override batch_size: u32;
override num_train_points: u32;
override num_test_points: u32;
override num_inputs: u32;
override l1_size: u32;
override l2_size: u32;
override l3_size: u32;
override num_weights: u32;
override num_bias: u32;
override num_epochs: u32;
override eta: f32;

var<workgroup> layer1: array<f32, l1_size * batch_size>;
var<workgroup> layer2: array<f32, l2_size * batch_size>;
var<workgroup> layer3: array<f32, l3_size * batch_size>;
var<workgroup> J: array<f32, num_weights * batch_size>;
var<workgroup> J_bias: array<f32, num_bias * batch_size>;

@compute @workgroup_size(group_size)
fn computeMain(@builtin(local_invocation_id) id : vec3<u32>) {

    var num_iterations = num_train_points/batch_size;
    var batch_id = id.x / num_inputs;
    var node_id = id.x % num_inputs;
    var l1_id = batch_id * l1_size;
    var l2_id = batch_id * l2_size;
    var l3_id = batch_id * l3_size;
    var sum: f32; var d: f32;
    var sm1: f32; var sm2: f32; var sm3: f32;
    var i: u32; var j: u32; var k: u32; var l: u32;
    var weight_addr: u32; var bias_addr: u32;

    // Iterate through the entire training set several times
    for (var epoch: u32 = 0; epoch < num_epochs; epoch++) {

        // Process nine minibatches per training set
        for (var iter: u32 = 0; iter < num_iterations; iter++) {

            var train_id = iter * batch_size * num_inputs + batch_id * num_inputs;
            weight_addr = node_id * num_inputs;
            bias_addr = node_id;

            // First layer
            sum = 0.0;
            for (i = 0; i < num_inputs; i++) {
                sum += train_data[train_id + i] * weights[weight_addr + i];
            }
            sum += bias_weights[bias_addr];
            layer1[l1_id + node_id] = max(0.0, sum);
            weight_addr += l1_size * num_inputs;
            bias_addr += num_inputs;
            workgroupBarrier();

            // Second layer
            sum = 0.0;
            for (i = 0; i < l1_size; i++) {
                sum += layer1[l1_id + i] * weights[weight_addr + i];
            }
            sum += bias_weights[bias_addr];
            layer2[l2_id + node_id] = max(0.0, sum);
            weight_addr += l2_size * l1_size;
            bias_addr += l2_size;
            workgroupBarrier();

            // Third layer
            if(node_id < l3_size) {
                sum = 0.0;
                for (i = 0; i < l2_size; i++) {
                    sum += layer2[l2_id + i] * weights[weight_addr + i];
                }
                sum += bias_weights[bias_addr];
                layer3[l3_id + node_id] = sum;
            }
            workgroupBarrier();

            // Compute softmax and loss gradient
            if(node_id == 0) {

                // Compute the softmax outputs
                d = exp(layer3[l3_id]) + exp(layer3[l3_id+1]) + exp(layer3[l3_id+2]);
                sm1 = exp(layer3[l3_id])/d;
                sm2 = exp(layer3[l3_id+1])/d;
                sm3 = exp(layer3[l3_id+2])/d;

                // Compute loss gradients for output nodes
                var res = train_results[iter * batch_size + batch_id];
                layer3[l3_id] = sm1 - res[0];
                layer3[l3_id+1] = sm2 - res[1];
                layer3[l3_id+2] = sm3 - res[2];

                var l2_offset = num_inputs * l1_size;
                var l3_offset = l2_offset + l1_size * l2_size;

                // Set loss gradients and biases to zero
                for (i = 0; i < num_weights; i++) {
                    J[batch_id * num_weights + i] = 0.0;
                }
                for (i = 0; i < num_bias; i++) {
                    J_bias[batch_id * num_bias + i] = 0.0;
                }

                // Compute elements of loss gradient
                for (i = 0; i < l3_size; i++) {

                    J_bias[batch_id * num_bias + l1_size + l2_size + i] = layer3[l3_id + i];

                    for (j = 0; j < l2_size; j++) {

                        // Set the Layer 3 weights
                        J[batch_id * num_weights + l3_offset + i * l2_size + j] = layer3[l3_id + i] * layer2[l2_id + j];

                        // Set Layer 2 weights
                        if (layer2[l2_id + j] > 0) {

                            J_bias[batch_id * num_bias + l1_size + j] += layer3[l3_id + i] * weights[l3_offset + i * l2_size + j];

                            for (k = 0; k < l1_size; k++) {

                                J[batch_id * num_weights + l2_offset + j * l1_size + k] +=
                                    layer3[l3_id + i] * weights[l3_offset + i * l2_size + j] * layer1[l1_id + k];

                                // Set Layer 1 weights
                                if (layer1[l1_id + k] > 0) {

                                    J_bias[batch_id * num_bias + k] += layer3[l3_id + i] * weights[l3_offset + i * l2_size + j] *
                                    weights[l2_offset + j * l1_size + k];

                                    for (l = 0; l < num_inputs; l++) {

                                        J[batch_id * num_weights + k * num_inputs + l] +=
                                            layer3[l3_id + i] * weights[l3_offset + i * l2_size + j] *
                                            weights[l2_offset + j * l1_size + k] * train_data[train_id + l];
                                    }
                                }
                            }
                        }
                    }
                }
            }
            workgroupBarrier();

            // Update weights and biases
            if (id.x == 0) {

                // Iterate through weights
                for (i = 0; i < num_weights; i++) {
                    sum = 0.0;
                    for (j = 0; j < batch_size; j++) {
                        sum += J[j * num_weights + i];
                    }
                    weights[i] -= eta * sum;
                }

                // Iterate through biases
                for (i = 0; i < num_bias; i++) {
                    sum = 0.0;
                    for (j = 0; j < batch_size; j++) {
                        sum += J_bias[j * num_bias + i];
                    }
                    bias_weights[i] -= eta * sum;
                }
            }
            storageBarrier();
        }
    }

    // Iterate through test points
    for (var test: u32 = 0; test < num_test_points; test++) {

        var test_addr = test * num_inputs;

        // First layer
        if (batch_id == 0) {
            sum = 0.0;
            for (i = 0; i < num_inputs; i++) {
                sum += test_data[test_addr + i] * weights[node_id * num_inputs + i];
            }
            sum += bias_weights[node_id];
            layer1[node_id] = max(0.0, sum);
        }
        workgroupBarrier();

        // Second layer
        weight_addr = l1_size * num_inputs;
        bias_addr = l1_size;        
        if (batch_id == 0) {
            sum = 0.0;
            for (i = 0; i < l1_size; i++) {
                sum += layer1[i] * weights[weight_addr + node_id * l1_size + i];
            }
            sum += bias_weights[bias_addr + node_id];
            layer2[node_id] = max(0.0, sum);
        }
        workgroupBarrier();

        // Third layer
        weight_addr += l2_size * l1_size;
        bias_addr += l2_size;
        if((batch_id == 0) && (node_id < l3_size)) {
            sum = 0.0;
            for (i = 0; i < l2_size; i++) {
                sum += layer2[i] * weights[weight_addr + node_id * l2_size + i];
            }
            sum += bias_weights[bias_addr + node_id];
            layer3[node_id] = sum;
        }
        workgroupBarrier();

        // Update test result buffer
        if(id.x == 0) {
            d = exp(layer3[0]) + exp(layer3[1]) + exp(layer3[2]);
            test_results[test * 3] = exp(layer3[0])/d;
            test_results[test * 3 + 1] = exp(layer3[1])/d;
            test_results[test * 3 + 2] = exp(layer3[2])/d;
        }
        storageBarrier();        
    }
}