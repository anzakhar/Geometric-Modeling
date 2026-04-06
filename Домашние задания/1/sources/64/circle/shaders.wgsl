override group_size: u32;
// СЧИТАТЬ ПЕРЕДАННЫЕ КОНСТАНТЫ В ШЕЙДЕРЕ

@binding(0) @group(0) var<storage, read> a : array<vec4f>;
@binding(1) @group(0) var<storage, read_write> res : array<vec4f>;

@compute @workgroup_size(group_size)
fn computeMain(@builtin(global_invocation_id) id : vec3<u32>) {

    var i : u32;
    var j : u32;
    var t : f32;
}