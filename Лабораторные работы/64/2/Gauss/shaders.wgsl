@binding(0) @group(0) var<storage, read_write> a_mat : array<f32>;
@binding(1) @group(0) var<storage, read_write> x_vec : array<f32>;
@binding(2) @group(0) var<storage, read_write> b_vec : array<f32>;

override matrix_dim: u32;

@compute @workgroup_size(matrix_dim)
fn computeMain(@builtin(global_invocation_id) gid : vec3<u32>) {

}