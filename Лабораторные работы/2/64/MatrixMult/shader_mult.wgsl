override vectors_per_row: u32;
override group_size_x: u32;
override group_size_y: u32;

@binding(0) @group(0) var<storage, read_write> aMat : array<vec4f>;
@binding(1) @group(0) var<storage, read_write> bMat : array<vec4f>;
@binding(2) @group(0) var<storage, read_write> cMat : array<f32>;

@compute @workgroup_size(group_size_x, group_size_y)
fn computeMain(@builtin(global_invocation_id) gid : vec3<u32>) {
    
    var sum = 0.0;
    let a_row = gid.x * vectors_per_row;
    let b_row = gid.y * vectors_per_row;
    
    // Multiply row of A by row of B^T
    for (var i: u32 = 0; i < vectors_per_row; i++) {
        sum += dot(aMat[a_row + i], bMat[b_row + i]);
    }   
    
    // Store the result to C
    cMat[a_row * 4 + gid.y] = sum;
}