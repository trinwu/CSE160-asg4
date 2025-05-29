// World.js 
// Vertex shader program
var VSHADER_SOURCE = `
precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;
  varying vec3 v_NormalDir;
  varying vec3 v_LightDir;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform vec3 u_lightPos;
  void main() { 
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    
    // Transform normal to world coordinates
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 1.0)));
    
    // Calculate world position
    v_VertPos = u_ModelMatrix * a_Position;
    
    // Calculate light direction in world coordinates
    vec3 lightVector = u_lightPos - vec3(v_VertPos);
    v_LightDir = normalize(lightVector);
    v_NormalDir = v_Normal;
  }`;

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_NormalDir;
  varying vec3 v_LightDir;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform int u_whichTexture;
  uniform vec3 u_lightPos;
  uniform vec3 u_cameraPos;
  uniform vec3 u_lightColor;
  varying vec4 v_VertPos;
  uniform bool u_lightOn;
  uniform bool u_normalVisualization;
  uniform bool u_spotlightOn;
  uniform vec3 u_spotlightDir;
  uniform float u_spotlightCutoff;
  
  void main() {
    // Normal visualization mode
    if(u_normalVisualization) {
        gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0);
        return;
    }
    
    // Base color/texture
    if(u_whichTexture == -2){
        gl_FragColor = u_FragColor;
    } else if(u_whichTexture == -1){
        gl_FragColor = vec4(v_UV, 1.0, 1.0);
    } else if(u_whichTexture == 0){
        gl_FragColor = texture2D(u_Sampler0, v_UV);
    } else if(u_whichTexture == 1){
        gl_FragColor = texture2D(u_Sampler1, v_UV);
    } else if(u_whichTexture == 2){
        gl_FragColor = texture2D(u_Sampler2, v_UV);
    } else{
        gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0);
    }

    if(u_lightOn) {
        // Phong lighting calculation in fragment shader
        vec3 N = normalize(v_NormalDir);
        vec3 L = normalize(v_LightDir);
        
        // Diffuse lighting (N dot L)
        float nDotL = max(dot(N, L), 0.0);
        
        // Specular lighting
        vec3 E = normalize(u_cameraPos - vec3(v_VertPos));
        vec3 R = reflect(-L, N);
        float specular = pow(max(dot(E, R), 0.0), 32.0);
        
        // Spotlight effect
        float spotlightEffect = 1.0;
        if(u_spotlightOn) {
            vec3 lightToFrag = normalize(vec3(v_VertPos) - u_lightPos);
            float spotCos = dot(lightToFrag, normalize(u_spotlightDir));
            float spotCutoff = cos(u_spotlightCutoff);
            
            if(spotCos < spotCutoff) {
                spotlightEffect = 0.0;
            } else {
                // Smooth falloff at edges
                spotlightEffect = pow((spotCos - spotCutoff) / (1.0 - spotCutoff), 2.0);
            }
        }
        
        // Combine lighting components
        vec3 ambient = vec3(gl_FragColor) * 0.2;
        vec3 diffuse = vec3(gl_FragColor) * nDotL * 0.7 * u_lightColor;
        vec3 spec = vec3(1.0) * specular * 0.3 * u_lightColor;
        
        gl_FragColor = vec4((ambient + (diffuse + spec) * spotlightEffect), gl_FragColor.a);
    }
  }`;

// Global Variables
let canvas;
let gl;
let a_Position;
let a_UV;
let a_Normal;
let u_FragColor;
let u_ModelMatrix;
let u_ProjectionMatrix;
let u_ViewMatrix;
let u_GlobalRotateMatrix;
let u_NormalMatrix;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_whichTexture;
let u_lightPos;
let u_lightOn;
let u_cameraPos;
let u_normalVisualization;
let u_lightColor;
let u_spotlightOn;
let u_spotlightDir;
let u_spotlightCutoff;

// Game state
let g_camera;

// Animal states - single jellyfish
let g_jellyfish = {
    x: 0,
    y: 0,
    z: 0,
    rotY: 0
};

function setupWebGL(){
    canvas = document.getElementById('webgl');
    if (!canvas) {
        console.error("Failed to get canvas element!");
        return;
    }
    console.log("Canvas found:", canvas.width, "x", canvas.height);

    gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    
    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);
    console.log("Viewport set to:", canvas.width, "x", canvas.height);
    
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Check for WebGL errors
    var error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error("WebGL setup error:", error);
    } else {
        console.log("WebGL context created successfully");
    }
}

function connectVariablesToGLSL(){
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // Get attribute locations
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }

    a_UV = gl.getAttribLocation(gl.program, 'a_UV');
    if (a_UV < 0) {
        console.log('Failed to get the storage location of a_UV');
        return;
    }

    a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    if (a_Normal < 0) {
        console.log('Failed to get the storage location of a_Normal');
        return;
    }

    // Get uniform locations
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
    u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
    u_Sampler1 = gl.getUniformLocation(gl.program, "u_Sampler1");
    u_Sampler2 = gl.getUniformLocation(gl.program, "u_Sampler2");
    u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
    u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
    u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
    u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
    u_normalVisualization = gl.getUniformLocation(gl.program, 'u_normalVisualization');
    u_lightColor = gl.getUniformLocation(gl.program, 'u_lightColor');
    u_spotlightOn = gl.getUniformLocation(gl.program, 'u_spotlightOn');
    u_spotlightDir = gl.getUniformLocation(gl.program, 'u_spotlightDir');
    u_spotlightCutoff = gl.getUniformLocation(gl.program, 'u_spotlightCutoff');

    var identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

// Globals related to UI elements
let g_globalAngle = 180;
let g_animate = false; 
let g_startTime = performance.now()/1000.0;
let g_seconds = performance.now()/1000.0-g_startTime;
let g_normalOn = false;
let g_lightPos = [2, 3, 2];
let g_lightOn = true;
let g_lightColor = [1.0, 1.0, 1.0];
let g_spotlightOn = false;
let g_spotlightDir = [0, -1, 0];
let g_spotlightCutoff = 30.0; // degrees

// Mouse tracking for camera rotation
let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

function addActionsForHtmlUI(){
    // Reset Button
    document.getElementById('resetButton').onclick = function() {
        g_camera = new Camera();
        g_jellyfish = { x: 0, y: 0, z: 0, rotY: 0 };
        renderAllShapes();
    };

    // Normal visualization
    document.getElementById('normalOn').onclick = function() {g_normalOn = true; renderAllShapes();};
    document.getElementById('normalOff').onclick = function() {g_normalOn = false; renderAllShapes();};

    // Lighting controls
    document.getElementById("lightOn").onclick = function(){g_lightOn = true; renderAllShapes();};
    document.getElementById("lightOff").onclick = function(){g_lightOn = false; renderAllShapes();};

    // Light position sliders
    document.getElementById("lightSlideX").addEventListener("input", function(){
        g_lightPos[0] = this.value/50; 
        renderAllShapes();
    });
    document.getElementById("lightSlideY").addEventListener("input", function(){
        g_lightPos[1] = this.value/50; 
        renderAllShapes();
    });
    document.getElementById("lightSlideZ").addEventListener("input", function(){
        g_lightPos[2] = this.value/50; 
        renderAllShapes();
    });

    // Light color sliders
    document.getElementById("lightColorR").addEventListener("input", function(){
        g_lightColor[0] = this.value/100; 
        renderAllShapes();
    });
    document.getElementById("lightColorG").addEventListener("input", function(){
        g_lightColor[1] = this.value/100; 
        renderAllShapes();
    });
    document.getElementById("lightColorB").addEventListener("input", function(){
        g_lightColor[2] = this.value/100; 
        renderAllShapes();
    });

    // Spotlight controls
    document.getElementById("spotlightOn").onclick = function(){g_spotlightOn = true; renderAllShapes();};
    document.getElementById("spotlightOff").onclick = function(){g_spotlightOn = false; renderAllShapes();};
    
    document.getElementById("spotlightCutoff").addEventListener("input", function(){
        g_spotlightCutoff = parseFloat(this.value); 
        renderAllShapes();
    });

    // Animation
    document.getElementById('animationOnButton').onclick = function() {g_animate = true;};
    document.getElementById('animationOffButton').onclick = function() {g_animate = false;};
    
    // Mouse events for camera rotation
    canvas.onmousedown = function(ev) {
        g_mouseDown = true;
        g_lastMouseX = ev.clientX;
        g_lastMouseY = ev.clientY;
    };
    
    canvas.onmouseup = function() {
        g_mouseDown = false;
    };
    
    canvas.onmousemove = function(ev) {
        if (!g_mouseDown) return;
        
        const newX = ev.clientX;
        const dx = newX - g_lastMouseX;
        
        if (dx !== 0) {
            g_camera.pan(-dx * 0.5); 
        }
        
        g_lastMouseX = newX;
        renderAllShapes();
    };
}

function drawBlockyAnimal(animal) {
    try {
        var animalModel = new BlockyAnimal();
        animalModel.matrix.translate(animal.x, animal.y, animal.z);
        animalModel.matrix.rotate(animal.rotY, 0, 1, 0);
        animalModel.render();
    } catch (e) {
        console.log("Could not render BlockyAnimal: ", e);
    }
}

function main() {
    console.log("Starting main function...");
    
    setupWebGL();
    if (!gl) {
        console.error("WebGL setup failed!");
        return;
    }
    console.log("WebGL setup successful");

    connectVariablesToGLSL();   
    console.log("GLSL variables connected");
    
    addActionsForHtmlUI();
    console.log("UI actions added");

    document.onkeydown = keydown;

    // Check if required functions exist
    if (typeof drawTriangle3DUVNormal === 'undefined') {
        console.error("drawTriangle3DUVNormal function is not defined! Make sure Triangle.js is loaded.");
        return;
    }
    console.log("drawTriangle3DUVNormal function exists");

    if (typeof Matrix4 === 'undefined') {
        console.error("Matrix4 class is not defined! Make sure cuon-matrix-cse160.js is loaded.");
        return;
    }
    console.log("Matrix4 class exists");

    if (typeof Camera === 'undefined') {
        console.error("Camera class is not defined! Make sure Camera.js is loaded.");
        return;
    }
    console.log("Camera class exists");

    // Initialize the camera with a better position
    g_camera = new Camera();
    if (g_camera.eye && g_camera.at) {
        g_camera.eye = new Vector3([0, 0, 5]);  // Moved back to see objects at origin
        g_camera.at = new Vector3([0, 0, 0]);   // Looking at origin
        if (g_camera.updateViewMatrix) {
            g_camera.updateViewMatrix();
        }
        console.log("Camera initialized at:", g_camera.eye.elements);
    } else {
        console.error("Camera initialization failed!");
        return;
    }

    // Set a more visible background color
    gl.clearColor(0.2, 0.2, 0.3, 1.0);
    console.log("Background color set");

    window.addEventListener('keydown', function(e) {
        if(e.key === ' ' && e.target == document.body) {
            e.preventDefault();
        }
    });

    console.log("Starting animation loop...");
    requestAnimationFrame(tick);
}

function tick() {
    console.log("tick() called, g_seconds:", g_seconds);
    g_seconds = performance.now()/1000.0-g_startTime;

    if (g_animate) {
        // Animate light position
        g_lightPos[0] = 2 * Math.cos(g_seconds * 0.5);
        g_lightPos[2] = 2 * Math.sin(g_seconds * 0.5);
        
        // Gentle jellyfish movement
        g_jellyfish.x = 0.2 * Math.sin(g_seconds * 0.3);
        g_jellyfish.z = 0.2 * Math.cos(g_seconds * 0.2);
        g_jellyfish.rotY = g_seconds * 10;
    }

    try {
        console.log("About to call renderAllShapes");
        renderAllShapes();
        console.log("renderAllShapes returned");
    } catch (e) {
        console.error("Rendering error:", e);
    }
    
    // Run for 5 seconds for debugging
    if (g_seconds < 5) {
        requestAnimationFrame(tick);
    } else {
        console.log("Stopping animation loop for debugging");
    }
}

function keydown(ev) {
    const key = ev.key.toLowerCase();
    
    if (key === ' ') {
        ev.preventDefault();
    }

    switch (key) {
        case 'w':
            g_camera.moveForward();
            break;
        case 's':
            g_camera.moveBackwards(); 
            break;
        case 'a':
            g_camera.moveLeft();
            break;
        case 'd':
            g_camera.moveRight();
            break;
        case 'q':
            g_camera.panLeft();
            break;
        case 'e':
            g_camera.panRight();
            break;
        case 'n':
            g_normalOn = !g_normalOn;
            break;
        case 'l':
            g_lightOn = !g_lightOn;
            break;
    }
    
    renderAllShapes();
}

function renderAllShapes(){
    var startTime = performance.now();

    // Set up matrices
    var projMat = new Matrix4();
    projMat.setPerspective(60, canvas.width/canvas.height, 0.1, 100);
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

    var viewMat = new Matrix4();
    viewMat.setLookAt(
        g_camera.eye.x, g_camera.eye.y, g_camera.eye.z,
        g_camera.at.x, g_camera.at.y, g_camera.at.z,
        g_camera.up.x, g_camera.up.y, g_camera.up.z
    );
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

    var globalRotMat = new Matrix4();
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Pass uniforms to shaders
    gl.uniform3f(u_cameraPos, g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2]);
    gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    gl.uniform1i(u_lightOn, g_lightOn);
    gl.uniform1i(u_normalVisualization, g_normalOn);
    gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
    gl.uniform1i(u_spotlightOn, g_spotlightOn);
    gl.uniform3f(u_spotlightDir, g_spotlightDir[0], g_spotlightDir[1], g_spotlightDir[2]);
    gl.uniform1f(u_spotlightCutoff, g_spotlightCutoff * Math.PI / 180.0);

    // Draw a simple test cube first to ensure basic rendering works
    drawSimpleTestCube();

    // Try to draw the jellyfish
    try {
        drawBlockyAnimal(g_jellyfish);
    } catch (e) {
        console.log("Error drawing jellyfish:", e);
    }

    // Display info
    displayInfo();

    var duration = performance.now() - startTime;
    sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");
}

function drawSimpleTestCube() {
    // Draw a simple cube using basic triangles to test rendering
    gl.uniform1i(u_whichTexture, -2);
    gl.uniform4f(u_FragColor, 1.0, 0.0, 0.0, 1.0); // Red color
    
    var modelMatrix = new Matrix4();
    modelMatrix.translate(0, 0, 0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    
    var normalMatrix = new Matrix4();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
    
    // Simple cube vertices (just front face for testing)
    var vertices = [
        -0.5, -0.5, 0.5,   0.5, -0.5, 0.5,   0.5, 0.5, 0.5,
        -0.5, -0.5, 0.5,   0.5, 0.5, 0.5,   -0.5, 0.5, 0.5
    ];
    
    var normals = [
        0, 0, 1,   0, 0, 1,   0, 0, 1,
        0, 0, 1,   0, 0, 1,   0, 0, 1
    ];
    
    var uvs = [
        0, 0,   1, 0,   1, 1,
        0, 0,   1, 1,   0, 1
    ];
    
    drawTriangle3DUVNormal(vertices, uvs, normals);
}

function displayInfo() {
    let infoText = "WASD: Move | Q/E: Rotate | N: Normal Vis | L: Toggle Light | Mouse: Look around";
    sendTextToHTML(infoText, "instructions");
}

// Drawing functions that your Dome and BlockyAnimal classes need
var g_vertexBuffer = null;

function initTriangle3D() {
    g_vertexBuffer = gl.createBuffer();
    if (!g_vertexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
}

function drawTriangle3D(vertices) {
    var n = vertices.length/3;

    if(g_vertexBuffer==null){
        initTriangle3D();
    }

    // Set default normals and UVs for compatibility
    var normals = [];
    var uvs = [];
    for(var i = 0; i < n; i++) {
        normals.push(0, 0, 1); // Default normal pointing up
        uvs.push(0, 0); // Default UV
    }

    // Position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Normal buffer
    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    // UV buffer
    var uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, n);
}

function drawTriangle3DUVNormal(vertices, uv, normals) {
    var n = vertices.length/3;

    var vertexBuffer = gl.createBuffer();
    if(!vertexBuffer){
        console.log("Failed to create the buffer object");
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    var uvBuffer = gl.createBuffer();
    if(!uvBuffer){
        console.log("Failed to create the buffer object");
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    var normalBuffer = gl.createBuffer();
    if(!normalBuffer){
        console.log("Failed to create the buffer object");
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);
    
    gl.drawArrays(gl.TRIANGLES, 0, n);
}

function sendTextToHTML(text, htmlID){
    var htmlElm = document.getElementById(htmlID);
    if(!htmlElm){
        console.log("Failed to get " + htmlID + " from HTML");
        return;
    }
    htmlElm.innerHTML = text;
}