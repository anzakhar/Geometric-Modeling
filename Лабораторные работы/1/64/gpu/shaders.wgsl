override group_size: u32;
// СЧИТАТЬ ПЕРЕДАННЫЕ КОНСТАНТЫ В ШЕЙДЕРЕ

// A runtime-sized array in a storage buffer
struct Data {
    values: array<vec4f>, // Runtime-sized array
};

@binding(0) @group(0) var<storage, read> pointsCtr : Data;
@binding(1) @group(0) var<storage, read_write> pointsSpline : Data;

@compute @workgroup_size(group_size)
fn computeMain(@builtin(global_invocation_id) id : vec3<u32>) {

    var i : u32;
    var j : u32;
    var t : f32;
    var omega : f32;

    // РАСЧЕТ КООРДИНАТ ТОЧКИ СПЛАЙНА
    // pointsSpline.values[id.x].x = pointsCtr.values[i].x * (1 - omega) + pointsCtr.values[i + 1].x * omega;
}