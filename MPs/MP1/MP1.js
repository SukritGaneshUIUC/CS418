/**
 * @file A simple WebGL example drawing a dancing Illinois "I" Logo
 * @author Sukrit Ganesh <sukritg2@eillinois.edu>
 * 
 * Updated Spring 2021 to use WebGL 2.0 and GLSL 3.00
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the objects to be frawn */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

/** @global The vertex array object */
var vertexArrayObject;

/** @global The ModelView matrix contains any modeling and viewing transformations */
var modelViewMatrix = glMatrix.mat4.create();

/** @global Whether I-Logo animation is being played (true) or the other animation is being played (false) */
var ILOGO_ANIMATION_PLAYING;

/** @global Records time last frame was rendered */
var previousTime = 0;

/** @global Records the elapsed time since the last frame was rendered */
var deltaTime = 0;

/** @global Vertex dimensions (3D) */
var DIMENSIONS = 3;

/** @global Number of vertices in triangle */
var TRIANGLE_VERTICES = 3;

// HELPER FUNCTIONS

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

/**
 * Divides all elements of an array by a value
 * 
 * @param {array} arr the array to perform division on
 * @param {float} val the value to divide all ements of arr by
 */
function arrayDivide(arr, val) {
  for (i = 0; i < arr.length; i++) {
    arr[i] = arr[i] / val;
  }
  return arr;
}

/**
 * Returns the euclidean distance between two points in 3D
 * 
 * @param {float} p1 the first point
 * @param {float} p2 the second point
 */
function euclidean(p1, p2) {
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2) + Math.pow(p1[2] - p2[2], 2));
}

// INFRASTRUCTURE

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var context = null;
  context = canvas.getContext("webgl2");
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Set up the fragment and vertex shaders.
 */
function setupShaders() {
  // Compile the shaders' source code.
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  // Link the shaders together into a program.
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  // We only use one shader program for this example, so we can just bind
  // it as the current program here.
  gl.useProgram(shaderProgram);
    
  // Query the index of each attribute in the list of attributes maintained
  // by the GPU. 
  shaderProgram.vertexPositionAttribute =
    gl.getAttribLocation(shaderProgram, "aVertexPosition");
  shaderProgram.vertexColorAttribute =
    gl.getAttribLocation(shaderProgram, "aVertexColor");
    
  //Get the index of the Uniform variable as well
  shaderProgram.modelViewMatrixUniform =
    gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
}

/**
 * Loads a shader.
 * Retrieves the source code from the HTML document and compiles it.
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
    
  var shaderSource = shaderScript.text;
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

/**
 * Draws a frame to the screen.
 */
function draw() {
  // Transform the clip coordinates so the render fills the canvas dimensions.
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  // Clear the screen.
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Use the vertex array object that we set up.
  gl.bindVertexArray(vertexArrayObject);
    
  // Send the ModelView matrix with our transformations to the vertex shader.
  gl.uniformMatrix4fv(shaderProgram.modelViewMatrixUniform,
                      false, modelViewMatrix);
    
  // Render the animation objects. 
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
  
  // Unbind the vertex array object to be safe.
  gl.bindVertexArray(null);
}

// SPECIFIC TO I-LOGO

/** @global The rotation angle of the I-Logo */
var rotAngle = 0;

/** @global Records the time in the "trig dance" animation */
var trigDanceTime = 0;

/** @global Records the previous "sin" taken by the trig-dance animation (in order to gague direction) */
var prevSin = 0;

/** @global The direction of the dance (1 for right-to-left, -1 for left-to-right) */
var danceDirection = 1;

/** @global The x-offset of the I-logo, a component of the trig dance */
var xOffset = 0;

/** @global The y-offset of the I-logo, a component of the trig dance */
var yOffset = 0;

/** @global The amount by which the I-logo is scaled by, a component of the trig dance */
var i_logo_scale = 1.0;

/** @global Numbers between -1 and 1 used to generate distortions in the I-logo */
var distortions = [0,0,0,0]

/**
 * Returns an array of vertices corresponding to the Illinois "I" Logo
 */
function generateILogo() {
  // arbitrary distortions in pixels - the distortions array is generated by the animate frame, distortions (translations) applied to some pixels
  var ad1 = 1.0 + 0.2 * distortions[0];
  var ad2 = 1.0 + 0.25 * distortions[1];
  var ad3 = 1.0 + 0.27 * distortions[2];
  var ad4 = 1.0 + 0.24 * distortions[3];

  var ovb = 0.4 * i_logo_scale;
  var ohb = 0.3 * i_logo_scale;
  var ivb = 0.2 * i_logo_scale;
  var ihb = 0.1 * i_logo_scale;

  var p0 = [-ohb * ad1, ovb, 0.0];
  var p1 = [ohb, ovb, 0.0];
  var p2 = [ohb * ad1, ivb * ad3, 0.0];
  var p3 = [ihb, ivb, 0.0];
  var p4 = [ihb, -ivb * ad2, 0.0];
  var p5 = [ohb, -ivb * ad4, 0.0];
  var p6 = [ohb * ad3, -ovb, 0.0];
  var p7 = [-ohb * ad2, -ovb, 0.0];
  var p8 = [-ohb, -ivb, 0.0];
  var p9 = [-ihb, -ivb * ad3, 0.0];
  var p10 = [-ihb * ad1, ivb * ad2, 0.0];
  var p11 = [-ohb * ad4, ivb * ad4, 0.0];

  var triangles = [];
  triangles.push(p0.concat(p10).concat(p11));
  triangles.push(p0.concat(p1).concat(p10));
  triangles.push(p1.concat(p2).concat(p3));
  triangles.push(p1.concat(p3).concat(p10));

  triangles.push(p3.concat(p4).concat(p10));
  triangles.push(p4.concat(p9).concat(p10));

  triangles.push(p4.concat(p5).concat(p6));
  triangles.push(p4.concat(p6).concat(p7));
  triangles.push(p4.concat(p7).concat(p9));
  triangles.push(p7.concat(p8).concat(p9));

  var logo = []
  for (i = 0; i < triangles.length; i++) {
    logo = logo.concat(triangles[i]);
  }

  return logo;
}

/**
 * Returns an array of RGBA colors (unpacked), with a color entry for every single vertex of every single triangle
 */
function generateILogoColors(vertices) {
  var orange = [255.0, 150.0 * (1.0 + 0.2 * distortions[0]), 0.0, 255.0];
  arrayDivide(orange, 255.0);
  var colors = []
  for (i = 0; i < vertices.length / 3; i++) {
    colors = colors.concat(orange);
  }
  return colors
}

/**
 * Execute the I-Logo animation
 * 
 * Step 1: Non-Matrix-Operation animation
 *  a) Update distortions
 *  b) Update rotation
 * 
 * Step 2: Execute Animation
 *  a) Translation
 *  b) Rotation
 * 
 */
function animateILogo() {
  // Read the speed slider from the web page.
  var speed = document.getElementById("I-Logo-Speed").value;

  // record the trigDanceTime
  trigDanceTime += deltaTime;

  // bookkeeping: prevSin and danceDirection
  var dance_speed_factor = 1.5;
  var currSin = Math.sin(degToRad(speed * dance_speed_factor * trigDanceTime));
  if (currSin > prevSin) {
    danceDirection = 1
  } else {
    danceDirection = -1
  }
  prevSin = currSin;

  // Update distortion factors
  var distortionSpeeds = [0.2, -0.4, 0.7, -0.3]
  for (i = 0; i < distortionSpeeds.length; i++) {
    distortions[i] = Math.sin(degToRad(speed * (dance_speed_factor + distortionSpeeds[i]) * trigDanceTime));
  }

  // Update geometry to scale "I" logo
  var zoom_speed_factor = dance_speed_factor;
  var zoom_delta = 0.5;
  var max_zoom = 1.0;
  var zoom_rads = degToRad(speed * zoom_speed_factor * trigDanceTime);
  i_logo_scale = max_zoom - Math.abs(Math.sin(zoom_rads)) * zoom_delta
  
  // Update deometry to move "I" side-to-side
  var translate_speed_factor = zoom_speed_factor;
  var translate_distance_factor = 0.5;
  var translate_rads = degToRad(speed * translate_speed_factor * trigDanceTime);
  xOffset = Math.sin(translate_rads) * translate_distance_factor;
  yOffset = Math.abs(Math.cos(translate_rads)) * translate_distance_factor;
  var translation = glMatrix.vec3.fromValues(xOffset, yOffset, 0);
  glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, translation);

  // Update geometry to rotate 'speed' degrees per second.
  var rotate_speed_factor = 1.0;
  rotAngle += speed * rotate_speed_factor * deltaTime;
  if (rotAngle > 360.0) {
    rotAngle = 0.0;
  }
  else if (rotAngle < 0.0) {
    rotAngle = 0.0;
  }
  var zRotate = glMatrix.vec3.fromValues(0,0,1);
  glMatrix.mat4.rotate(modelViewMatrix, modelViewMatrix, degToRad(rotAngle), zRotate);
}

// SPECIFIC TO BALL BOUNCING ANIMATION

/**
 * Creates a ball object
 * 
 * @param {float} r the radius of the ball
 * @param {[float]} p the position of the ball
 * @param {float} d the direction of the ball (degrees, with east being zero)
 * @param {float} s the initial speed of the ball
 * @param {[float]} c the color of the ball (range 0-255)
 */
function createBall(r, p, d, s, c) {
  arrayDivide(c, 255.0);
  var ball = {radius: r, position: p, direction: d, speed: s, color: c};
  return ball;
}

/**
 * Function to create the balls which will be used in the animation
 */
function createBalls() {
  var balls = [];
  var b1 = createBall(0.07, [-0.7, 0.7, -0.10], 101, 0.9, [255.0, 155.0, 120.0, 255.0]);
  balls.push(b1);
  var b2 = createBall(0.05, [-0.5, -0.3, -0.11], 121, 1.1, [255.0, 0.0, 0.0, 255.0]);
  balls.push(b2);
  var b3 = createBall(0.09, [0.2, -0.6, -0.12], 33, 1, [0.0, 0.0, 255.0, 255.0]);
  balls.push(b3);
  var b4 = createBall(0.08, [0.8, 0.5, -0.13], 201, 1.2, [166.0, 121.0, 122.0, 255.0]);
  balls.push(b4);
  // console.log(balls.length);
  ballCount = balls.length;
  return balls;
}

/**
 * Render a circle using a triangle fan
 * 
 * @param {float} radius the radius of the circle
 * @param {[float]} position the center of the circle
 * @param {[float]} color the primary color of the circle (0-1 range)
 * @param {int} fan_spokes the number of triangles used to render the circle (in a fan shape)
 * @param {boolean} gradient whether or not the circle should be rendered with a gradient from the center outwards
 * @param {[float]} gradient_color the secondary color of the circle (0-1 range)
 */
function renderCircle(radius, position, color, fan_spokes, gradient = false, gradient_color = [0.0, 0.0, 0.0, 0.0]) {
  var step = degToRad(360.0 / fan_spokes);
  var vertices = [];
  var colors = [];
  var x_center = position[0];
  var y_center = position[1];
  var z_center = position[2];
  for (i = 0; i < fan_spokes; i++) {
    var v1 = [x_center, y_center, z_center];
    var v2 = [x_center + radius * Math.cos(step * (i + 0)), y_center + radius * Math.sin(step * (i + 0)), z_center];
    var v3 = [x_center + radius * Math.cos(step * (i + 1)), y_center + radius * Math.sin(step * (i + 1)), z_center];
    vertices = vertices.concat(v1);
    vertices = vertices.concat(v2);
    vertices = vertices.concat(v3);
  }
  for (i = 0; i < vertices.length / DIMENSIONS / TRIANGLE_VERTICES; i++) {
    if (gradient) {
      colors = colors.concat(gradient_color);
    } else {
      colors = colors.concat(color);
    }
    colors = colors.concat(color);
    colors = colors.concat(color);
  }
  return [vertices, colors];
}

/** @global the array containing the balls used in the animation */
var balls = createBalls();

/** @global the number of balls used in the animation */
var ballCount = 0;

/** @global xMin, xMax, yMin, yMax the viewspace boundaries */
var xMin = -1.0;
var xMax = 1.0;
var yMin = -1.0;
var yMax = 1.0;

/**
 * Generates the background for the ball bounce animation
 * 
 * Includes a sky, sun, and grass, with the horizon at the y=0 plane.
 */
function generateBackground() {
  vertices = [];
  colors = [];

  var skyBlue = [0.0, 204.0, 255.0, 255.0];
  var skyBlueLight = [204.0, 255.0, 255.0, 255.0];
  var grassGreen = [0.0, 154.0, 23.0, 255.0]
  var sunYellow = [255.0, 255.0, 0.0, 255.0]

  // The Sky ...
  arrayDivide(skyBlue, 255.0);
  arrayDivide(skyBlueLight, 255.0);
  var st = renderCircle(1.5, [0.0, 0.0, 0.0], skyBlue, 30, gradient=true, skyBlueLight);
  vertices = vertices.concat(st[0]);
  colors = colors.concat(st[1]);

  // The Sun ...
  arrayDivide(sunYellow, 255.0);
  st = renderCircle(0.5, [0.0, -0.2, -0.7], sunYellow, 30);
  vertices = vertices.concat(st[0]);
  colors = colors.concat(st[1]);

  // The Grass ...
  arrayDivide(grassGreen, 255.0);
  var v0 = [0.0, 0.0, -0.8];
  var v1 = [-1.0, 0.0, -0.6];
  var v2 = [-1.0, -1.0, -0.6];
  var v3 = [1.0, -1.0, -0.6];
  var v4 = [1.0, 0.0, -0.6];
  var grassvts = [];
  grassvts = grassvts.concat(v0).concat(v1).concat(v2);
  grassvts = grassvts.concat(v0).concat(v2).concat(v3);
  grassvts = grassvts.concat(v0).concat(v3).concat(v4);
  var grasscols = [];
  for (i = 0; i < grassvts.length / 3; i++) {
    grasscols = grasscols.concat(grassGreen);
  }

  vertices = vertices.concat(grassvts);
  colors = colors.concat(grasscols);

  return [vertices, colors]
}

/**
 * Renders the balls stored in the balls array
 */
function renderBalls() {
  vertices = [];
  colors = [];

  // for (k = 0; k < ballCount; k++) {
  //   var cb = balls[k];
  //   var st = renderCircle(cb.radius, cb.position, cb.color, 30);
  //   vertices = vertices.concat(st[0]);
  //   colors = colors.concat(st[1]);
  // }

  var st = renderCircle(balls[0].radius, balls[0].position, balls[0].color, 30);
  vertices = vertices.concat(st[0]);
  colors = colors.concat(st[1]);

  var st = renderCircle(balls[1].radius, balls[1].position, balls[1].color, 30);
  vertices = vertices.concat(st[0]);
  colors = colors.concat(st[1]);

  var st = renderCircle(balls[2].radius, balls[2].position, balls[2].color, 30);
  vertices = vertices.concat(st[0]);
  colors = colors.concat(st[1]);

  var st = renderCircle(balls[3].radius, balls[3].position, balls[3].color, 30);
  vertices = vertices.concat(st[0]);
  colors = colors.concat(st[1]);

  // console.log(vertices.length);

  return [vertices, colors];
}

/**
 * Returns the vertices (and corresponding colors) of the Ball Bounce Scene
 */
function generateBallBounceScene() {
  var vertices = [];
  var colors = [];

  // Background: 
  var st = generateBackground();
  vertices = vertices.concat(st[0]);
  colors = colors.concat(st[1]);

  // Balls:
  var stb = renderBalls();
  vertices = vertices.concat(stb[0]);
  colors = colors.concat(stb[1]);

  return [vertices, colors]
}

/**
 * Handles collisions with the boundaries of the viewspace
 * 
 * @param {float} angle the angle of the ball
 * @param {[float]} position the position of the ball
 * @param {float} radius the radius of the ball
 */
function animateWallCollision(angle, position, radius) {
  if (position[0] < xMin + radius) {
    if (angle >= 90 && angle <= 270) {
      angle = 180 - angle;
    }
  }
  if (position[0] > xMax - radius) {
    if (angle <= 90 || angle >= 270) {
      angle = 180 - angle;
    }
  }
  if (position[1] < yMin + radius) {
    if (angle >= 180 && angle <= 360) {
      angle = 360 - angle;
    }
  }
  if (position[1] > yMax - radius) {
    if (angle >= 0 && angle <= 180) {
      angle = 360 - angle;
    }
  }
  if (angle >= 360) {
    angle -= 360;
  }
  if (angle <= 0) {
    angle += 360;
  }
  return angle;
}

/**
 * Handles collisions with the boundaries of the viewspace
 * Ball angle changes semi-randomly in the event of a collision
 * 
 * @param {float} angle the angle of the ball
 * @param {[float]} position the position of the ball
 * @param {float} radius the radius of the ball
 * @param {int} idx the index of the ball
 */
function animateBallCollision(angle, position, radius, idx) {
  for (j = 0; j < balls.length; j++) {
    if (j != idx && euclidean(position, balls[j].position) < radius + balls[j].radius) {
      // console.log("collide");
      // // find the average angle, then reflect off the imaginary axis formed by that angle
      // var avg = ((angle + balls[j].direction) / 2.0) % 180;
      // var angle_avg_basis = angle - avg;
      // angle_avg_basis *= -1;
      // angle = angle_avg_basis + avg;
      // // return the new angle
      // return (angle + 360) % 360;
      console.log(euclidean(position, balls[j].position));
      console.log(position);
      console.log(balls[j].position);
      if (angle < balls[j].direction) {
        return ((Math.random() * 180) + balls[j].direction + 360) % 360;
      }
      return ((balls[j].direction - Math.random() * 180) + 360) % 360;
    }
  }
  return angle;
}

/**
 * Execute the Ball Bounce animation
 * 
 */
function animateBallBounce() {
  // Read the speed slider from the web page.
  var speed = document.getElementById("Ball-Bounce-Speed").value / 100;

  for (i = 0; i < balls.length; i++) {
    var position = balls[i].position;
    var angle = balls[i].direction;
    var radius = balls[i].radius;
    var ball_speed = balls[i].speed;

    // Check collisions with other balls
    angle = animateBallCollision(angle, position, radius, i);

    // Check collisions with sides
    angle = animateWallCollision(angle, position, radius);

    var deltaX = Math.cos(degToRad(angle)) * speed * ball_speed * deltaTime;
    var deltaY = Math.sin(degToRad(angle)) * speed * ball_speed * deltaTime;
    balls[i].direction = angle;
    balls[i].position = [position[0] + deltaX, position[1] + deltaY, position[2]];
  }
}

// EXECUTE EVERY FRAME

/**
 * Set up the buffers to hold the animation's vertex positions and colors.
 */
function setupBuffers() {
    
  // Create the vertex array object, which holds the list of attributes for
  // the object.
  vertexArrayObject = gl.createVertexArray();
  gl.bindVertexArray(vertexArrayObject); 

  // Create a buffer for positions, and bind it to the vertex array object.
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);

  // Generate the Vertices
  if (document.getElementById("I").checked == true) {
    // The "I" logo: https://www.desmos.com/calculator/xbqsckz6gb
    var vertices = generateILogo()
  }
  else {
    var st = generateBallBounceScene();
    var vertices = st[0];
  }

  // Populate the buffer with the position data.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  var item_size = 3;
  vertexPositionBuffer.itemSize = item_size;
  vertexPositionBuffer.numberOfItems = vertices.length / item_size;

  // Binds the buffer that we just made to the vertex position attribute.
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  
  // Do the same steps for the color buffer.
  // add a cool color distortion as well
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);

  // Generate the Colors
  if (document.getElementById("I").checked == true) {
    // The "I" logo colors
    var colors = generateILogoColors(vertices);
  }
  else {
    var colors = st[1];
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  var color_size = 4;
  vertexColorBuffer.itemSize = color_size;
  vertexColorBuffer.numItems = colors.length / color_size;  
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                         vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
   // Enable each attribute we are using in the VAO.  
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
    
  // Unbind the vertex array object to be safe.
  gl.bindVertexArray(null);
}

/**
 * Runs the animation for the I-Logo or the Bouncing Balls
 */
 function animate(currentTime) {
  // Convert the time to seconds.
  currentTime *= 0.001;
  // Subtract the previous time from the current time.
  deltaTime = currentTime - previousTime;
  // Remember the current time for the next frame.
  previousTime = currentTime;

  glMatrix.mat4.identity(modelViewMatrix);

  if (document.getElementById("I").checked == true) {
    animateILogo(currentTime);
  }
  else {
    animateBallBounce();
  }

  // Setup buffers
  setupBuffers();     

  // Draw the frame.
  draw();
  
  // Animate the next frame. The animate function is passed the current time in
  // milliseconds.
  requestAnimationFrame(animate);
}

// CALLED ON STARTUP

/**
 * Startup function called from html code to start the program.
 */
 function startup() {
  console.log("Starting animation...");
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders(); 
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  requestAnimationFrame(animate); 
}
