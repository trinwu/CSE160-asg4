class Dome {
  constructor() {
    this.type = 'dome';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2; // Use solid color
    this.segments = 30; 
    this.radius = 0.5;
    this.maxTheta = Math.PI * 0.7; 
  }
  
  render() {
    // Pass the texture number
    gl.uniform1i(u_whichTexture, this.textureNum);
    
    // Pass the color
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    
    // Pass the transformation matrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    
    // Calculate and pass normal matrix
    var normalMat = new Matrix4();
    normalMat.setInverseOf(this.matrix);
    normalMat.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMat.elements);
  
    let seg = this.segments;
    for (let i = 0; i < seg/2; i++) {
      let theta1 = i * this.maxTheta / (seg/2);
      let theta2 = (i+1) * this.maxTheta / (seg/2);
    
      for (let j = 0; j <= seg; j++) {
        let phi1 = j * 2 * Math.PI / seg;
        let phi2 = (j+1) * 2 * Math.PI / seg;
    
        let p1 = this.sphericalToCartesian(theta1, phi1, this.radius);
        let p2 = this.sphericalToCartesian(theta2, phi1, this.radius);
        let p3 = this.sphericalToCartesian(theta1, phi2, this.radius);
        let p4 = this.sphericalToCartesian(theta2, phi2, this.radius);
        
        // Calculate normals (for spheres, normal = normalized position)
        let n1 = this.sphericalToCartesian(theta1, phi1, 1.0); // Unit sphere normal
        let n2 = this.sphericalToCartesian(theta2, phi1, 1.0);
        let n3 = this.sphericalToCartesian(theta1, phi2, 1.0);
        let n4 = this.sphericalToCartesian(theta2, phi2, 1.0);
        
        let progress1 = theta1 / (Math.PI/2);
        let progress2 = theta2 / (Math.PI/2);
        
        let fade1 = 1.0;
        let squish1 = 1.0;
        if (progress1 > 0.7) {
          let t = (progress1 - 0.7) / 0.3;
          fade1 = 1.0 - 0.4 * t;
          squish1 = 1.0 - 0.5 * t;
        }
        let fade2 = 1.0;
        let squish2 = 1.0;
        if (progress2 > 0.7) {
          let t = (progress2 - 0.7) / 0.3;
          fade2 = 1.0 - 0.4 * t;
          squish2 = 1.0 - 0.5 * t;
        }
        
        // Apply transformations to points
        p1[0] *= fade1; p1[2] *= fade1; p1[1] *= squish1;
        p2[0] *= fade2; p2[2] *= fade2; p2[1] *= squish2;
        p3[0] *= fade1; p3[2] *= fade1; p3[1] *= squish1;
        p4[0] *= fade2; p4[2] *= fade2; p4[1] *= squish2;
    
        // Create UV coordinates (simple mapping)
        let uv1 = [phi1 / (2 * Math.PI), theta1 / this.maxTheta];
        let uv2 = [phi1 / (2 * Math.PI), theta2 / this.maxTheta];
        let uv3 = [phi2 / (2 * Math.PI), theta1 / this.maxTheta];
        let uv4 = [phi2 / (2 * Math.PI), theta2 / this.maxTheta];
        
        // First triangle: p1, p2, p4
        drawTriangle3DUVNormal([
          p1[0], p1[1], p1[2],
          p2[0], p2[1], p2[2],
          p4[0], p4[1], p4[2]
        ], [
          uv1[0], uv1[1],
          uv2[0], uv2[1],
          uv4[0], uv4[1]
        ], [
          n1[0], n1[1], n1[2],
          n2[0], n2[1], n2[2],
          n4[0], n4[1], n4[2]
        ]);
        
        // Second triangle: p1, p4, p3
        drawTriangle3DUVNormal([
          p1[0], p1[1], p1[2],
          p4[0], p4[1], p4[2],
          p3[0], p3[1], p3[2]
        ], [
          uv1[0], uv1[1],
          uv4[0], uv4[1],
          uv3[0], uv3[1]
        ], [
          n1[0], n1[1], n1[2],
          n4[0], n4[1], n4[2],
          n3[0], n3[1], n3[2]
        ]);
      }
    }
  }
  
  sphericalToCartesian(theta, phi, r) {
    let x = r * Math.sin(theta) * Math.cos(phi);
    let y = r * Math.cos(theta);
    let z = r * Math.sin(theta) * Math.sin(phi);
    return [x, y, z];
  }
}