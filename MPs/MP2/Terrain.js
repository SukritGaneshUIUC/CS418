/**
 * @file Terrain.js - A simple 3D terrain model for WebGL
 * @author Ian Rudnick <itr2@illinois.edu>
 * @author Sukrit Ganesh <sukritg2@illinois.edu>
 * @brief Starter code for CS 418 MP2 at the University of Illinois at
 * Urbana-Champaign. Sukrit Ganesh completed the terrain generation MP.
 * 
 * Updated Spring 2021 for WebGL 2.0/GLSL 3.00 ES.
 * 
 * You'll need to implement the following functions:
 * setVertex(v, i) - convenient vertex access for 1-D array
 * getVertex(v, i) - convenient vertex access for 1-D array
 * generateTriangles() - generate a flat grid of triangles
 * shapeTerrain() - shape the grid into more interesting terrain
 * calculateNormals() - calculate normals after warping terrain
 * 
 * Good luck! Come to office hours if you get stuck!
 */

 //-------------------------------------------------------------------------
// Helper Functions

/**
 * Generates a random number in the range [min, max)
 * 
 * @param {float} minVal The lower bound for the random number
 * @param {float} maxVal The upper bound for the random number
 * 
 * @return {float} A random float in the range [min, max)
 */
function randRange(minVal, maxVal) {
    var rv = minVal + Math.random() * (maxVal - minVal);
    // console.log(rv);
    return rv;
}


/**
 * 
 * @param {float} minX The minimim x-value
 * @param {float} minY The minimim y-value
 * @param {float} minZ The minimim z-value
 * @param {float} minX The minimim x-value
 * @param {float} minY The minimim y-value
 * @param {float} minZ The minimim z-value
 * 
 * @return {[float]} A random point in the range [minX, minY, minZ] to [maxX, maxY, maxZ]
 */
function generateRandomPoint(minX, minY, minZ, maxX, maxY=0, maxZ=0) {
    var xVal = randRange(minX, maxX);
    var yVal = randRange(minY, maxY);
    var zVal = randRange(minZ, maxZ);

    return [xVal, yVal, zVal];
}

/**
 * Multiply all elements in an array by a constant k (a.k.a. scaling). Original array is not modified, scaled array is returned.
 * 
 * @param {[float]} arr An array
 * 
 * @return {[float]} arr scaled by k
 */
function scale(arr, k) {
    var scaled = [];
    for (var i = 0; i < arr.length; i++) {
        scaled.push(arr[i]) * k;
    }
    return scaled;
}

/**
 * Get the magnitude (2-norm) of a vector.
 * 
 * @param {[float]} v A vector
 * 
 * @return {float} Magnitude of v 
 */
function magnitude(v) {
    var mag = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return mag;
}

/**
 * Get the normalized (2-norm) vector (a.k.a. unit vector). Function does not change original vector.
 * 
 * @param {[float]} v A vector
 * 
 * @return {[float]} Unit vector of v 
 */
function unitVector(v) {
    var mag = magnitude(v);
    var uv = scale(v, 1 / mag);
    return uv;
}

/**
 * Performs element-wise addition on two arrays
 * Truncates both arrays to the minimum length of the two arrays if lengths are unequal
 * 
 * @param {[float]} arr1 The first array
 * @param {[float]} arr2 The second array
 * 
 * @return {[float]} arr1[:minLen] <element-wise addition> arr2[:minLen], where minLen is the smaller of the two array lengths
 */
function addArr(arr1, arr2) {
    var arr3 = []
    for (var i = 0; i < Math.min(arr1.length, arr2.length); i++) {
        arr3.push(arr1[i] + arr2[i]);
    }
    return arr3;
}

/**
 * Performs element-wise subtraction on two arrays
 * Truncates both arrays to the minimum length of the two arrays if lengths are unequal
 * 
 * @param {[float]} arr1 The minuend array
 * @param {[float]} arr2 The subtrahend array
 * 
 * @return {[float]} arr1[:minLen] <element-wise subtraction> arr2[:minLen], where minLen is the smaller of the two array lengths
 */
function subArr(arr1, arr2) {
    var arr3 = []
    for (var i = 0; i < Math.min(arr1.length, arr2.length); i++) {
        arr3.push(arr1[i] - arr2[i]);
    }
    return arr3;
}

/**
 * Takes the dot product of two vectors
 * Truncates both vectors to the minimum length of the two arrays if lengths are unequal
 * 
 * @param {[float]} v1 The first vector
 * @param {[float]} v2 The second vector
 * 
 * @return {[float]} v1[:minLen] <dot> v2[:minLen], where minLen is the smaller of the two array lengths
 */
function dotProduct(v1, v2) {
    var dp = 0;
    for (var i = 0; i < Math.min(v1.length, v2.length); i++) {
        dp += v1[i] * v2[i];
    }
    return dp;
}

/**
 * Takes the cross product of two 3D vectors
 * 
 * @param {[float]} v1 The first vector
 * @param {[float]} v2 The second vector
 *
 * @return {[float]} v1 <cross> v2
 */
function crossProduct(v1, v2) {
    return [v1[1] * v2[2] - v1[2] * v2[1], v1[0] * v2[2] - v1[2] * v2[0], v1[0] * v2[1] - v1[1] * v2[0]];
}

/**
 * Calculate the distance from a point to a plane
 * 
 * @param {float} p A point on the plane 
 * @param {float} n The normal vector of the plane 
 * @param {float} b A point in space
 * 
 * @return {float} The distance from the point b to plane p-n
 */
function pointPlaneDistance(p, n, b) {
    var unit_normal = unitVector(n);
    var v = subArr(b, p);
    var dp = dotProduct(v, unit_normal);

    return Math.abs(dp);
}

/**
 * g(r): Weight Displacement Coefficient Function
 * Calculates how much to alter vertical displacement by, depending on a vertex's distance to the dividing plane
 * 
 * @param {float} little_r The distance from the vertex to the dividing plane
 * @param {float} big_R Hyperparameter limiting the displacement function
 * 
 * @return {float} (1 - r / R)^2 if r < R, otherwise 0
 */
function weightDisplacementCoefficientFunction(little_r, big_R) {
    var gr = 0;
    if (little_r < big_R) {
        gr = Math.pow(1 - Math.pow((little_r / big_R), 2), 2);
    } 
    return gr;
}

/**
 * Calculate the weighted displacement given a vertex and dividing plane
 * 
 * @param {float} p A point on the dividing plane 
 * @param {float} n The normal vector of the dividing plane 
 * @param {float} b The vertex 
 * @param {float} curr_delta The displacement delta value 
 * @param {float} big_R Hyperparameter limiting the weighted displacement function 
 * 
 * @return {float} The weighted displacement to apply to the vertex
 */
function calculateDisplacement(p, n, b, curr_delta, big_R) {
    // Take dot product (b - p) . n
    var dp = dotProduct(subArr(b, p), n);

    // Find displacement weight
    var little_r = pointPlaneDistance(p, n, b);
    var gr = weightDisplacementCoefficientFunction(little_r, big_R);
    var delta = curr_delta * gr;
    // delta = curr_delta;
    
    // Find current displacement magnitude
    var curr_displacement = delta;

    // Determine direction of displacement depending on dot product and current delta
    if (dp < 0) {
        curr_displacement *= -1;
    }  

    return curr_displacement;
}

class Terrain {   
    /**
     * Initializes the members of the Terrain object.
     * @param {number} div Number of triangles along the x-axis and y-axis.
     * @param {number} minX Minimum X coordinate value.
     * @param {number} maxX Maximum X coordinate value.
     * @param {number} minY Minimum Y coordinate value.
     * @param {number} maxY Maximum Y coordinate value.
     * @param {number} PASSES Terrain generation hyperparameter for number of faulting method passes
     * @param {number} DELTA Terrain generation hyperparameter for initial vertical displacement
     * @param {number} R Terrain generation hyperparameter for eeighted displacements
     * @param {number} H Terrain generation hyperparameter for faulting parameter difference
     */
    constructor(div, minX, maxX, minY, maxY, PASSES=300, DELTA=0.012, R=0.3, H=0.005) {
        this.div = div;
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
        this.PASSES = PASSES;
        this.DELTA = DELTA;
        this.R = R;
        this.H = H;
        
        // Allocate the vertex array
        this.positionData = [];
        // Allocate the normal array.
        this.normalData = [];
        // Allocate the triangle array.
        this.faceData = [];
        // Allocate an array for edges so we can draw a wireframe.
        this.edgeData = [];
        console.log("Terrain: Allocated buffers");
        
        this.generateTriangles();
        console.log("Terrain: Generated triangles");
        
        this.generateLines();
        console.log("Terrain: Generated lines");

        this.shapeTerrain();
        console.log("Terrain: Sculpted terrain");

        this.calculateNormals();
        console.log("Terrain: Generated normals");

        // You can use this function for debugging your buffers:
        // this.printBuffers();
    }


    //-------------------------------------------------------------------------
    // Vertex access and triangle generation - your code goes here!
    /**
     * Set the x,y,z coords of the ith vertex
     * @param {Object} v An array of length 3 holding the x,y,z coordinates.
     * @param {number} i The index of the vertex to set.
     */
    setVertex(v, i) {
        // MP2: Implement this function!
        this.positionData[i*3]= v[0];
        this.positionData[i*3 + 1] = v[1];
        this.positionData[i*3 + 2] = v[2];
    }
    

    /**
     * Retrieves the x,y,z coords of the ith vertex.
     * @param {Object} v An array of length 3 to hold the x,y,z coordinates.
     * @param {number} i The index of the vertex to get.
     */
    getVertex(v, i) {
        // MP2: Implement this function!
        v[0]=this.positionData[i*3];
        v[1]=this.positionData[i*3 + 1];
        v[2]=this.positionData[i*3 + 2];
    }


    /**
     * Gennerate the triangles used for the terrain mesh in indexed-face format.
     */    
    generateTriangles() {
        // MP2: Implement the rest of this function!

        // Generate the vertex positions
        var deltaX = (this.maxX - this.minX) / this.div;
        var deltaY = (this.maxY - this.minY) / this.div;
        
        for(var i = 0; i <= this.div; i++){
            for(var j = 0; j <= this.div; j++) { 
                this.positionData.push(this.minX + deltaX * j);
                this.positionData.push(this.minY + deltaY * i);
                this.positionData.push(0);
            }
        }  

        // Generate the triangle faces (with indexed vertices)
        var verticesPerSide = this.div + 1;

        for(var i = 0; i < this.div; i++){
            for(var j = 0; j < this.div; j++) { 
                // we first generate the indices of the lower left, lower right, upper right, upper left vertices of current "box"
                var ul = (i + 1) * verticesPerSide + j;
                var ll = i * verticesPerSide + j;
                var lr = ll + 1;
                var ur = ul + 1;

                // upper triangle
                var upperTriangle = [ll, ur, ul];
                this.faceData = this.faceData.concat(upperTriangle);

                // lower triangle
                var lowerTriangle = [ll, lr, ur];
                this.faceData = this.faceData.concat(lowerTriangle);
            }
        }   

        // We'll need these to set up the WebGL buffers.
        this.numVertices = this.positionData.length/3;
        this.numFaces = this.faceData.length/3;
    }

    /**
     * Generates a realistic terrain using the flat triangular grid.
     */
    shapeTerrain() {
        // MP2: Implement this function!

        // Keep track of per-vertex z-axis displacement
        var displacements = []

        // current delta (displacement factor for current pass)
        var curr_delta = this.DELTA;

        // Multiple passes of faulting method
        for (var pass_no = 0; pass_no < this.PASSES; pass_no++) {
                    
            // Step 0: Generate a random point in [minX, minY, 0] to [maxX, maxY, 0]
            var p = generateRandomPoint(this.minX, this.minY, this.maxX, this.maxY);

            // Step 1: Generate random normal vector n <xn, yn, 0>
            var pi = 3.141592;
            var theta = randRange(0, 2*pi);
            var n = [Math.cos(theta), Math.sin(theta), 0];

            // console.log(pass_no, '| pt: ', p, ' | n: ', n);

            // Step 2: Iterate over all vertices
            // raise/lower z-coord of vertex depending on which side of dividing plane p-n they're on
            for (var i = 0; i < this.numVertices; i++) {
                // Get current vertex
                var b = [0,0,0]
                this.getVertex(b, i);

                // Calculate the weighted z-axis displacement for the current vertex
                var curr_displacement = calculateDisplacement(p, n, b, curr_delta, this.R);
                displacements.push(curr_displacement);

                // Apply delta to current vertex
                b[2] += curr_displacement;
                this.setVertex(b, i);
            }

            // adjust curr_delta for next pass
            curr_delta = curr_delta / (Math.pow(2, this.H));
        }

        // for (var i = 0; i < this.numVertices; i++) {
        //     var b = [0,0,0]
        //     this.getVertex(b, i);
        //     console.log('Vertex: ', i, ': ', b);
        // }

    }


    /**
     * Calculates the normal vectors of all vertices in the triangle mesh. 
     * Vertex normals are weighted averages of the normals of neighboring triangles.
     */
    calculateNormals() {
        // MP2: Implement this function!

        // Vector to store normal vectors
        var normals = [];
        for (var i = 0; i < this.numVertices; i++) {
            normals.push([0,0,0]);
        }

        // Iterate over all triangles
        for (var i = 0; i < this.numFaces; i++) {
            var v0_idx = this.faceData[i * 3];
            var v1_idx = this.faceData[i * 3 + 1];
            var v2_idx = this.faceData[i * 3 + 2];

            var v0 = [0,0,0];
            var v1 = [0,0,0];
            var v2 = [0,0,0];
            this.getVertex(v0, v0_idx);
            this.getVertex(v1, v1_idx);
            this.getVertex(v2, v2_idx);

            // Find the normal vector of the current triangle
            var vec1 = subArr(v1,v0);
            var vec2 = subArr(v2,v0);
            var normal = crossProduct(vec1, vec2);
            var scaledNormal = scale(normal, 0.5 * magnitude(normal));

            // Add the normal vector to the cumulative normals of v0, v1, and v2
            normals[v0_idx] = addArr(normals[v0_idx], scaledNormal);
            normals[v1_idx] = addArr(normals[v1_idx], scaledNormal);
            normals[v2_idx] = addArr(normals[v2_idx], scaledNormal);
        }

        // Normalize all the normals
        for (var i = 0; i < normals.length; i++) {
            normals[i] = unitVector(normals[i]);
        }

        // Add normals to normalData
        this.normalData = [];
        for (var i = 0; i < normals.length; i++) {
            this.normalData = this.normalData.concat(normals[i]);
        }
    }

    getMinElevation() {
        var minZ = this.positionData[2];
        for (var i = 0; i < this.numVertices; i++) {
            var currVertex = [0,0,0];
            this.getVertex(currVertex, i);
            if (currVertex[2] < minZ) {
                minZ = currVertex[2];
            }
        }
        return minZ;
    }

    getMaxElevation() {
        var maxZ = this.positionData[2];
        for (var i = 0; i < this.numVertices; i++) {
            var currVertex = [0,0,0];
            this.getVertex(currVertex, i);
            if (currVertex[2] > maxZ) {
                maxZ = currVertex[2];
            }
        }
        return maxZ;
    }


    //-------------------------------------------------------------------------
    // Setup code (run once)
    /**
     * Generates line data from the faces in faceData for wireframe rendering.
     */
    generateLines() {
        for (var f = 0; f < this.faceData.length/3; f++) {
            // Calculate index of the face
            var fid = f*3;
            this.edgeData.push(this.faceData[fid]);
            this.edgeData.push(this.faceData[fid+1]);
            
            this.edgeData.push(this.faceData[fid+1]);
            this.edgeData.push(this.faceData[fid+2]);
            
            this.edgeData.push(this.faceData[fid+2]);
            this.edgeData.push(this.faceData[fid]);
        }
    }


    /**
     * Sets up the WebGL buffers and vertex array object.
     * @param {object} shaderProgram The shader program to link the buffers to.
     */
    setupBuffers(shaderProgram) {
        // Create and bind the vertex array object.
        this.vertexArrayObject = gl.createVertexArray();
        gl.bindVertexArray(this.vertexArrayObject);

        // Create the position buffer and load it with the position data.
        this.vertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positionData),
                      gl.STATIC_DRAW);
        this.vertexPositionBuffer.itemSize = 3;
        this.vertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.vertexPositionBuffer.numItems, " vertices.");

        // Link the position buffer to the attribute in the shader program.
        gl.vertexAttribPointer(shaderProgram.locations.vertexPosition,
                               this.vertexPositionBuffer.itemSize, gl.FLOAT, 
                               false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.locations.vertexPosition);
    
        // Specify normals to be able to do lighting calculations
        this.vertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normalData),
                      gl.STATIC_DRAW);
        this.vertexNormalBuffer.itemSize = 3;
        this.vertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.vertexNormalBuffer.numItems, " normals.");

        // Link the normal buffer to the attribute in the shader program.
        gl.vertexAttribPointer(shaderProgram.locations.vertexNormal,
                               this.vertexNormalBuffer.itemSize, gl.FLOAT, 
                               false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.locations.vertexNormal);
    
        // Set up the buffer of indices that tells WebGL which vertices are
        // part of which triangles.
        this.triangleIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.faceData),
                      gl.STATIC_DRAW);
        this.triangleIndexBuffer.itemSize = 1;
        this.triangleIndexBuffer.numItems = this.faceData.length;
        console.log("Loaded ", this.triangleIndexBuffer.numItems, " triangles.");
    
        // Set up the index buffer for drawing edges.
        this.edgeIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.edgeData),
                      gl.STATIC_DRAW);
        this.edgeIndexBuffer.itemSize = 1;
        this.edgeIndexBuffer.numItems = this.edgeData.length;
        
        // Unbind everything; we want to bind the correct element buffer and
        // VAO when we want to draw stuff
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }
    

    //-------------------------------------------------------------------------
    // Rendering functions (run every frame in draw())
    /**
     * Renders the terrain to the screen as triangles.
     */
    drawTriangles() {
        gl.bindVertexArray(this.vertexArrayObject);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.triangleIndexBuffer.numItems,
                        gl.UNSIGNED_INT,0);
    }
    

    /**
     * Renders the terrain to the screen as edges, wireframe style.
     */
    drawEdges() {
        gl.bindVertexArray(this.vertexArrayObject);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
        gl.drawElements(gl.LINES, this.edgeIndexBuffer.numItems,
                        gl.UNSIGNED_INT,0);   
    }


    //-------------------------------------------------------------------------
    // Debugging
    /**
     * Prints the contents of the buffers to the console for debugging.
     */
    printBuffers() {
        for (var i = 0; i < this.numVertices; i++) {
            console.log("v ", this.positionData[i*3], " ", 
                              this.positionData[i*3 + 1], " ",
                              this.positionData[i*3 + 2], " ");
        }
        for (var i = 0; i < this.numVertices; i++) {
            console.log("n ", this.normalData[i*3], " ", 
                              this.normalData[i*3 + 1], " ",
                              this.normalData[i*3 + 2], " ");
        }
        for (var i = 0; i < this.numFaces; i++) {
            console.log("f ", this.faceData[i*3], " ", 
                              this.faceData[i*3 + 1], " ",
                              this.faceData[i*3 + 2], " ");
        }  
    }

} // class Terrain