// World.js - Fixed version with working camera and lighting
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
        // Phong lighting calculation
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
        console.error("Canvas not found!");
        return false;
    }
    
    gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return false;
    }
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    console.log("WebGL setup successful");
    return true;
}

function connectVariablesToGLSL(){
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return false;
    }

    // Get attribute locations
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    a_UV = gl.getAttribLocation(gl.program, 'a_UV');
    a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');

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

    // Check for errors
    if (a_Position < 0 || a_UV < 0 || a_Normal < 0) {
        console.error("Failed to get attribute locations");
        return false;
    }

    console.log("GLSL variables connected successfully");
    return true;
}

function addActionsForHtmlUI(){
    // Reset Button
    document.getElementById('resetButton').onclick = function() {
        g_camera = new Camera();
        g_camera.eye = new Vector3([3, 2, 3]);
        g_camera.at = new Vector3([0, 0, 0]);
        g_camera.up = new Vector3([0, 1, 0]);
        g_camera.updateViewMatrix();
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

    console.log("UI actions connected");
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
    console.log("Starting lighting demo...");
    
    if (!setupWebGL()) {
        return;
    }
    
    if (!connectVariablesToGLSL()) {
        return;
    }
    
    addActionsForHtmlUI();
    document.onkeydown = keydown;

    // Check if Camera class exists
    if (typeof Camera === 'undefined') {
        console.error("Camera class not found!");
        return;
    }

    // Initialize the camera with WORKING position
    g_camera = new Camera();
    g_camera.eye = new Vector3([3, 2, 3]);  // Position that can see origin
    g_camera.at = new Vector3([0, 0, 0]);   // Look at origin
    g_camera.up = new Vector3([0, 1, 0]);   // Up vector
    g_camera.updateViewMatrix();

    gl.clearColor(0.1, 0.1, 0.2, 1.0);
    console.log("Initialization complete");

    window.addEventListener('keydown', function(e) {
        if(e.key === ' ' && e.target == document.body) {
            e.preventDefault();
        }
    });

    requestAnimationFrame(tick);
}

function tick() {
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

    renderAllShapes();
    requestAnimationFrame(tick);
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

    // Set up matrices with CORRECT camera position
    var projMat = new Matrix4();
    projMat.setPerspective(60, canvas.width/canvas.height, 0.1, 100);
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

    var viewMat = new Matrix4();
    viewMat.setLookAt(
        g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
        g_camera.at.elements[0], g_camera.at.elements[1], g_camera.at.elements[2],
        g_camera.up.elements[0], g_camera.up.elements[1], g_camera.up.elements[2]
    );
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

    var globalRotMat = new Matrix4();
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Pass lighting uniforms to shaders
    gl.uniform3f(u_cameraPos, g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2]);
    gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    gl.uniform1i(u_lightOn, g_lightOn);
    gl.uniform1i(u_normalVisualization, g_normalOn);
    gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
    gl.uniform1i(u_spotlightOn, g_spotlightOn);
    gl.uniform3f(u_spotlightDir, g_spotlightDir[0], g_spotlightDir[1], g_spotlightDir[2]);
    gl.uniform1f(u_spotlightCutoff, g_spotlightCutoff * Math.PI / 180.0);

    // Draw light source as a small cube
    var light = new Cube();
    light.color = [g_lightColor[0] * 2, g_lightColor[1] * 2, g_lightColor[2] * 2, 1];
    light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    light.matrix.scale(0.1, 0.1, 0.1);
    light.render();

    // Draw a simple ground plane
    var ground = new Cube();
    ground.color = [0.3, 0.3, 0.3, 1.0];
    ground.matrix.translate(0, -2, 0);
    ground.matrix.scale(10, 0.1, 10);
    ground.render();

    // Draw the jellyfish
    drawBlockyAnimal(g_jellyfish);

    // Display info
    displayInfo();

    var duration = performance.now() - startTime;
    sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");
}

function displayInfo() {
    let infoText = "WASD: Move | Q/E: Rotate | N: Normal Vis | L: Toggle Light | Mouse: Look around";
    sendTextToHTML(infoText, "instructions");
}

function sendTextToHTML(text, htmlID){
    var htmlElm = document.getElementById(htmlID);
    if(!htmlElm){
        console.log("Failed to get " + htmlID + " from HTML");
        return;
    }
    htmlElm.innerHTML = text;
}