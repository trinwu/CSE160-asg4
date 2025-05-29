class Cube {
    constructor() {
        this.type = 'cube';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.textureNum = -2; // Default to solid color
    }

    render() {
        var rgba = this.color;

        // Pass the texture number
        gl.uniform1i(u_whichTexture, this.textureNum);

        // Pass the color of a point to u_FragColor uniform variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        // Set the transformation matrix
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        
        // Calculate and set normal matrix (inverse transpose of model matrix)
        var normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(this.matrix);
        normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        // Front face
        var frontVerts = [0.0, 0.0, 0.0,   1.0, 1.0, 0.0,   1.0, 0.0, 0.0,
                         0.0, 0.0, 0.0,   0.0, 1.0, 0.0,   1.0, 1.0, 0.0];
        var frontUVs = [0, 0,  1, 1,  1, 0,
                       0, 0,  0, 1,  1, 1];
        var frontNormals = [0, 0, 1,  0, 0, 1,  0, 0, 1,
                           0, 0, 1,  0, 0, 1,  0, 0, 1];
        drawTriangle3DUVNormal(frontVerts, frontUVs, frontNormals);

        // Back face
        var backVerts = [1.0, 0.0, 1.0,   0.0, 1.0, 1.0,   0.0, 0.0, 1.0,
                        1.0, 0.0, 1.0,   1.0, 1.0, 1.0,   0.0, 1.0, 1.0];
        var backUVs = [0, 0,  1, 1,  1, 0,
                      0, 0,  0, 1,  1, 1];
        var backNormals = [0, 0, -1,  0, 0, -1,  0, 0, -1,
                          0, 0, -1,  0, 0, -1,  0, 0, -1];
        drawTriangle3DUVNormal(backVerts, backUVs, backNormals);

        // Top face
        var topVerts = [0.0, 1.0, 0.0,   1.0, 1.0, 1.0,   1.0, 1.0, 0.0,
                       0.0, 1.0, 0.0,   0.0, 1.0, 1.0,   1.0, 1.0, 1.0];
        var topUVs = [0, 0,  1, 1,  1, 0,
                     0, 0,  0, 1,  1, 1];
        var topNormals = [0, 1, 0,  0, 1, 0,  0, 1, 0,
                         0, 1, 0,  0, 1, 0,  0, 1, 0];
        drawTriangle3DUVNormal(topVerts, topUVs, topNormals);

        // Bottom face
        var bottomVerts = [0.0, 0.0, 1.0,   1.0, 0.0, 0.0,   1.0, 0.0, 1.0,
                          0.0, 0.0, 1.0,   0.0, 0.0, 0.0,   1.0, 0.0, 0.0];
        var bottomUVs = [0, 0,  1, 1,  1, 0,
                        0, 0,  0, 1,  1, 1];
        var bottomNormals = [0, -1, 0,  0, -1, 0,  0, -1, 0,
                            0, -1, 0,  0, -1, 0,  0, -1, 0];
        drawTriangle3DUVNormal(bottomVerts, bottomUVs, bottomNormals);

        // Right face
        var rightVerts = [1.0, 0.0, 0.0,   1.0, 1.0, 1.0,   1.0, 0.0, 1.0,
                         1.0, 0.0, 0.0,   1.0, 1.0, 0.0,   1.0, 1.0, 1.0];
        var rightUVs = [0, 0,  1, 1,  1, 0,
                       0, 0,  0, 1,  1, 1];
        var rightNormals = [1, 0, 0,  1, 0, 0,  1, 0, 0,
                           1, 0, 0,  1, 0, 0,  1, 0, 0];
        drawTriangle3DUVNormal(rightVerts, rightUVs, rightNormals);

        // Left face
        var leftVerts = [0.0, 0.0, 1.0,   0.0, 1.0, 0.0,   0.0, 0.0, 0.0,
                        0.0, 0.0, 1.0,   0.0, 1.0, 1.0,   0.0, 1.0, 0.0];
        var leftUVs = [0, 0,  1, 1,  1, 0,
                      0, 0,  0, 1,  1, 1];
        var leftNormals = [-1, 0, 0,  -1, 0, 0,  -1, 0, 0,
                          -1, 0, 0,  -1, 0, 0,  -1, 0, 0];
        drawTriangle3DUVNormal(leftVerts, leftUVs, leftNormals);
    }

    renderfast() {
        var rgba = this.color;

        // Pass the texture number
        gl.uniform1i(u_whichTexture, -2);

        // Pass the color of a point to u_FragColor uniform variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        // Pass the matrix to u_ModelMatrix attribute
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        var allverts = [];

        // Front of cube
        allverts = allverts.concat([0,0,0, 1,1,0, 1,0,0]);
        allverts = allverts.concat([0,0,0, 0,1,0, 1,1,0]);

        // Top of cube
        allverts = allverts.concat([0,1,0, 0,1,1, 1,1,1]);
        allverts = allverts.concat([0,1,0, 1,1,1, 1,1,0]);

        // Right of cube
        allverts = allverts.concat([1,1,0, 1,1,1, 1,0,0]);
        allverts = allverts.concat([1,0,0, 1,1,1, 1,0,1]);

        // Left of cube
        allverts = allverts.concat([0,1,0, 0,1,1, 0,0,0]);
        allverts = allverts.concat([0,0,0, 0,1,1, 0,0,1]);

        // Bottom of cube
        allverts = allverts.concat([0,0,0, 0,0,1, 1,0,1]);
        allverts = allverts.concat([0,0,0, 1,0,1, 1,0,0]);

        // Back of cube
        allverts = allverts.concat([0,0,1, 1,1,1, 1,0,1]);
        allverts = allverts.concat([0,0,1, 0,1,1, 1,1,1]);

        drawTriangle3D(allverts);
    }

    renderfaster(){
        var rgba = this.color;

        // Pass the texture number
        gl.uniform1i(u_whichTexture, -2);

        // Pass the color of a point to u_FragColor uniform variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        // Pass the matrix to u_ModelMatrix attribute
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        if(g_vertexBuffer==null){
            initTriangle3D();
        }

        gl.bufferData(gl.ARRAY_BUFFER, this.cubeVerts32, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }
}