@binding(0) @group(0) var<storage, read_write> a_mat : array<f32>;
@binding(1) @group(0) var<storage, read_write> q_mat : array<f32>;
@binding(2) @group(0) var<storage, read_write> p_mat : array<f32>;
@binding(3) @group(0) var<storage, read_write> prod_mat : array<f32>;

override matrix_dim: u32;

var<workgroup> u_vec: array<f32, matrix_dim>;
var<workgroup> dot: f32;
var<workgroup> u_length_squared: f32;

@compute @workgroup_size(matrix_dim)
fn computeMain(@builtin(global_invocation_id) gid : vec3<u32>) {

    /* Variable declarations */
    var vec_length = 0.0;
    var prod: f32;
    var i: u32;
    var j: u32;
        
    /* Load first column into workgroup memory */
    u_vec[gid.x] = a_mat[gid.x * matrix_dim];
    storageBarrier();
    
    /* Find length of first column and u vector */
    if (gid.x == 0) {
        for (i = 1; i < matrix_dim; i++) {
            vec_length += u_vec[i] * u_vec[i];
        }
        u_length_squared = vec_length;
        vec_length = sqrt(vec_length + u_vec[0] * u_vec[0]);
        a_mat[0] = vec_length;
        u_vec[0] -= vec_length;
        u_length_squared += u_vec[0] * u_vec[0];

    }
    else {
        a_mat[gid.x * matrix_dim] = 0.0;
    }
    storageBarrier();

    /* Transform further columns of A */
    for (i = 1; i < matrix_dim; i++) {
        dot = 0.0;
        if(gid.x == 0) {
            for (j = 0; j < matrix_dim; j++) {
                dot += a_mat[j * matrix_dim + i] * u_vec[j];
            }
        }
        workgroupBarrier();
        a_mat[gid.x * matrix_dim + i] -= 2 * u_vec[gid.x] * dot/u_length_squared;
    }

    /* Update Q matrix */
    for (i = 0; i < matrix_dim; i++) {
        q_mat[gid.x * matrix_dim + i] = -2 * u_vec[i] * u_vec[gid.x]/u_length_squared;
    }
    q_mat[gid.x * matrix_dim + gid.x] += 1;
    storageBarrier();
    
    /* Loop through other columns */
    for (var col: u32 = 1; col < matrix_dim-1; col++) {
        
        /* Load new column into memory */
        u_vec[gid.x] = a_mat[gid.x * matrix_dim + col];
        workgroupBarrier();
        
        /* Find length of A column and u vector */
        if(gid.x == col) {
            vec_length = 0.0;
            for (i = col + 1; i < matrix_dim; i++) {
                vec_length += u_vec[i] * u_vec[i];
            }
            u_length_squared = vec_length;
            vec_length = sqrt(vec_length + u_vec[col] * u_vec[col]);
            u_vec[col] -= vec_length;
            u_length_squared += u_vec[col] * u_vec[col];
            a_mat[col * matrix_dim + col] = vec_length;
        }
        else if(gid.x > col) {
            a_mat[gid.x * matrix_dim + col] = 0.0;            
        }
        storageBarrier();
        
        /* Transform further columns of A */
        for (i = col+1; i < matrix_dim; i++) {
            if(gid.x == 0) {
                dot = 0.0;                
                for (j = 0; j < matrix_dim; j++) {
                    dot += a_mat[j * matrix_dim + i] * u_vec[j];
                }
            }
            workgroupBarrier();
            
            if(gid.x >= col) {
                a_mat[gid.x * matrix_dim + i] -= 2 * u_vec[gid.x] * dot/u_length_squared;
            }
            storageBarrier();
        }
        
        /* Update P matrix */
        if (gid.x >= col) {
            for (i = col; i < matrix_dim; i++) {
                p_mat[gid.x * matrix_dim + i] = -2 * u_vec[i] * u_vec[gid.x]/u_length_squared;
            }
            p_mat[gid.x * matrix_dim + gid.x] += 1;
        }
        storageBarrier();
        
        /* Multiply q_mat * p_mat = prod_mat */
        for (i = col; i < matrix_dim; i++) {
            prod = 0.0;
            for (j = col; j < matrix_dim; j++) {
                prod += q_mat[gid.x * matrix_dim + j] * p_mat[j * matrix_dim + i];
            }
            prod_mat[gid.x * matrix_dim + i] = prod;
        }
        storageBarrier();
        
        /* Place the content of prod_mat in q_mat */
        for (i = col; i < matrix_dim; i++) {
            q_mat[gid.x * matrix_dim + i] = prod_mat[gid.x * matrix_dim + i];
        }
        storageBarrier();
    }
}