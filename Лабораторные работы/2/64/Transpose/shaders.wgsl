override block_dim: u32;
override group_size: u32;

@binding(0) @group(0) var<storage, read_write> matrix : array<vec4f>;

@compute @workgroup_size(group_size)
fn computeMain(@builtin(global_invocation_id) gid : vec3<u32>) {

    /* Matrix variables */
    var src_mat: mat4x4f;
    var dst_mat: mat4x4f;
        
    /* Determine the row and column of the invocation's block */
    var tmp = block_dim;
    var col = gid.x;
    var row = u32(0);
    while (col >= tmp) {
        col -= tmp;
        tmp--;
        row++;
    }
    col += row;
    
    /* Read source block into source matrix */
    src_mat = mat4x4f(
        matrix[4 * row * block_dim + col], 
        matrix[(4 * row + 1) * block_dim + col],
        matrix[(4 * row + 2) * block_dim + col],
        matrix[(4 * row + 3) * block_dim + col]);

    /* Take the transpose of source matrix */
    src_mat = transpose(src_mat);

    /* Block on matrix diagonal */
    if (row == col) {
        matrix[4 * row * block_dim + col] = src_mat[0];
        matrix[(4 * row + 1) * block_dim + col] = src_mat[1];
        matrix[(4 * row + 2) * block_dim + col] = src_mat[2];
        matrix[(4 * row + 3) * block_dim + col] = src_mat[3];
    }
    /* Block off matrix diagonal */
    else {

        /* Read destination block into destination matrix */
        dst_mat = mat4x4f(
            matrix[4 * col * block_dim + row], 
            matrix[(4 * col + 1) * block_dim + row],
            matrix[(4 * col + 2) * block_dim + row],
            matrix[(4 * col + 3) * block_dim + row]);

        /* Take the transpose of source matrix */
        dst_mat = transpose(dst_mat);
    
        /* Write transposed destination matrix to source block */
        matrix[4 * row * block_dim + col] = dst_mat[0];
        matrix[(4 * row + 1) * block_dim + col] = dst_mat[1];
        matrix[(4 * row + 2) * block_dim + col] = dst_mat[2];
        matrix[(4 * row + 3) * block_dim + col] = dst_mat[3];
        
        /* Write transposed source matrix to destination block */
        matrix[4 * col * block_dim + row] = src_mat[0];
        matrix[(4 * col + 1) * block_dim + row] = src_mat[1];
        matrix[(4 * col + 2) * block_dim + row] = src_mat[2];
        matrix[(4 * col + 3) * block_dim + row] = src_mat[3];
    }
}