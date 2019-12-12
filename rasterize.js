/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
// const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog3/triangles2.json"; // triangles file loc
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog4/triangles.json"; // triangles file loc
const LIGHTMAP_URL = "https://ncsucgclass.github.io/prog4/lightmap.gif";
// const URL = "https://ncsucgclass.github.io/prog4/";
const URL = "https://ychosen.github.io/";
var defaultEye = vec3.fromValues(0.0, 1.4, -0.8); // default eye position in world space
// var defaultEye = vec3.fromValues(0.0, 10, -0.8); // default eye position in world space
var defaultCenter = vec3.fromValues(0.0, 0.0, 0.0); // default view direction in world space
var defaultUp = vec3.fromValues(0, 1, 0); // default view up vector
var lightAmbient = vec3.fromValues(1, 1, 1); // default light ambient emission
var lightDiffuse = vec3.fromValues(1, 1, 1); // default light diffuse emission
var lightSpecular = vec3.fromValues(1, 1, 1); // default light specular emission
var lightPosition = vec3.fromValues(0.5, 0.7, 0.5); // default light position
var rotateTheta = Math.PI / 50; // how much to rotate models by with each key press
var Blinn_Phong = true;
var lightMap = false;
/* webgl and geometry data */
var gl = null; // the all powerful gl object. It's all here folks!
var inputTriangles = []; // the triangle data as loaded from input files
var numTriangleSets = 0; // how many triangle sets in input scene
var inputEllipsoids = []; // the ellipsoid data as loaded from input files
var numEllipsoids = 0; // how many ellipsoids in the input scene
var vertexBuffers = []; // this contains vertex coordinate lists by set, in triples
var normalBuffers = []; // this contains normal component lists by set, in triples
var textureBuffers = [];
var triSetSizes = []; // this contains the size of each triangle set
var triangleBuffers = []; // lists of indices into vertexBuffers by set, in triples
var viewDelta = 0; // how much to displace view with each key press
var triIndex = [[], []];

/* shader parameter locations */
var vPosAttribLoc; // where to put position for vertex shader
var vNormAttribLoc;
var vTexCoordLoc;
var mMatrixULoc; // where to put model matrix for vertex shader
var pvmMatrixULoc; // where to put project model view matrix for vertex shader
var ambientULoc; // where to put ambient reflecivity for fragment shader
var diffuseULoc; // where to put diffuse reflecivity for fragment shader
var specularULoc; // where to put specular reflecivity for fragment shader
var shininessULoc; // where to put specular exponent for fragment shader
var alphaULoc;
var Blinn_PhongULoc;
var lightMapULoc;
var lightMapTextureULoc;
var lightMapTexture;
var textureULoc;
/* interaction variables */
var Eye = vec3.clone(defaultEye); // eye position in world space
var Center = vec3.clone(defaultCenter); // view direction in world space
var Up = vec3.clone(defaultUp); // view up vector in world space
var isPerspectiveProjection = true;
var gamOver = false;
var bSpeed = 0.05;
var eSpeed = 0.03;
var dir = 0;
var bulletInd = [];
// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url, descr) {
    try {
        if ((typeof (url) !== "string") || (typeof (descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET", url, false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now() - startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open " + descr + " file!";
            else
                return JSON.parse(httpReq.response);
        } // end if good params
    } // end try    

    catch (e) {
        console.log(e);
        return (String.null);
    }
} // end get input json file

// does stuff when keys are pressed
function handleKeyDown(event) {
    const whichModel = 9;

    const modelEnum = {TRIANGLES: "triangles", ELLIPSOID: "ellipsoid"}; // enumerated model type
    const dirEnum = {NEGATIVE: -1, POSITIVE: 1}; // enumerated rotation direction

    // function highlightModel(modelType) {
    //     if (handleKeyDown.modelOn != null)
    //         handleKeyDown.modelOn.on = false;
    handleKeyDown.whichOn = whichModel;
    // if (modelType == modelEnum.TRIANGLES)
    handleKeyDown.modelOn = inputTriangles[whichModel];
    // else
    //     handleKeyDown.modelOn = inputEllipsoids[whichModel];
    handleKeyDown.modelOn.on = true;

    // } // end highlight model

    function translateModel(offset) {
        if (handleKeyDown.modelOn != null)
            vec3.add(handleKeyDown.modelOn.translation, handleKeyDown.modelOn.translation, offset);
    } // end translate model

    function rotateModel(axis, direction) {
        if (handleKeyDown.modelOn != null) {
            var newRotation = mat4.create();

            mat4.fromRotation(newRotation, direction * rotateTheta, axis); // get a rotation matrix around passed axis
            vec3.transformMat4(handleKeyDown.modelOn.xAxis, handleKeyDown.modelOn.xAxis, newRotation); // rotate model x axis tip
            vec3.transformMat4(handleKeyDown.modelOn.yAxis, handleKeyDown.modelOn.yAxis, newRotation); // rotate model y axis tip
        } // end if there is a highlighted model
    } // end rotate model

    // set up needed view params
    var lookAt = vec3.create(), viewRight = vec3.create(), temp = vec3.create(); // lookat, right & temp vectors
    lookAt = vec3.normalize(lookAt, vec3.subtract(temp, Center, Eye)); // get lookat vector
    viewRight = vec3.normalize(viewRight, vec3.cross(temp, lookAt, Up)); // get view right vector

    // highlight static variables
    handleKeyDown.whichOn = handleKeyDown.whichOn == undefined ? -1 : handleKeyDown.whichOn; // nothing selected initially
    handleKeyDown.modelOn = handleKeyDown.modelOn == undefined ? null : handleKeyDown.modelOn; // nothing selected initially

    switch (event.code) {

        // model selection
        case "Space":
            // if (handleKeyDown.modelOn != null)
            //     handleKeyDown.modelOn.on = false; // turn off highlighted model
            // handleKeyDown.modelOn = null; // no highlighted model
            // handleKeyDown.whichOn = -1; // nothing highlighted
            var pos = vec3.add(temp, inputTriangles[whichModel].translation, inputTriangles[whichModel]['vertices'][0]);
            addBullet(pos, dir, "bullet");
            break;
        case "ArrowRight": // select next triangle set
            highlightModel(modelEnum.TRIANGLES, (handleKeyDown.whichOn + 1) % numTriangleSets);
            break;
        case "ArrowLeft": // select previous triangle set
            highlightModel(modelEnum.TRIANGLES, (handleKeyDown.whichOn > 0) ? handleKeyDown.whichOn - 1 : numTriangleSets - 1);
            break;

        case "Comma": // Perpective projection
            isPerspectiveProjection = true;
            break;

        case "Equal": // Perpective projection
            isPerspectiveProjection = false;
            break;

        // view change
        case "KeyA": // translate view left, rotate left with shift
            dir = 3;
            translateModel(vec3.scale(temp, viewRight, -viewDelta));
            // Center = vec3.add(Center, Center, vec3.scale(temp, viewRight, viewDelta));
            // if (!event.getModifierState("Shift"))
            //     Eye = vec3.add(Eye, Eye, vec3.scale(temp, viewRight, viewDelta));
            break;
        case "KeyD": // translate view right, rotate right with shift
            dir = 1;
            translateModel(vec3.scale(temp, viewRight, viewDelta));
            // Center = vec3.add(Center, Center, vec3.scale(temp, viewRight, -viewDelta));
            // if (!event.getModifierState("Shift"))
            //     Eye = vec3.add(Eye, Eye, vec3.scale(temp, viewRight, -viewDelta));
            break;
        case "KeyS": // translate view backward, rotate up with shift
            // translateModel(vec3.scale(temp, lookAt, -viewDelta));
            dir = 2;
            translateModel([0.0, 0.0, -0.05]);
            // if (event.getModifierState("Shift")) {
            //     Center = vec3.add(Center, Center, vec3.scale(temp, Up, viewDelta));
            //     Up = vec3.cross(Up, viewRight, vec3.subtract(lookAt, Center, Eye)); /* global side effect */
            // } else {
            //     Eye = vec3.add(Eye, Eye, vec3.scale(temp, lookAt, -viewDelta));
            //     Center = vec3.add(Center, Center, vec3.scale(temp, lookAt, -viewDelta));
            // } // end if shift not pressed
            break;
        case "KeyW": // translate view forward, rotate down with shift
            // translateModel(vec3.scale(temp, lookAt, viewDelta));
            dir = 0;
            translateModel([0.0, 0.0, 0.05]);
            // if (event.getModifierState("Shift")) {
            //     Center = vec3.add(Center, Center, vec3.scale(temp, Up, -viewDelta));
            //     Up = vec3.cross(Up, viewRight, vec3.subtract(lookAt, Center, Eye)); /* global side effect */
            // } else {
            //     Eye = vec3.add(Eye, Eye, vec3.scale(temp, lookAt, viewDelta));
            //     Center = vec3.add(Center, Center, vec3.scale(temp, lookAt, viewDelta));
            // } // end if shift not pressed
            break;
        case "KeyQ": // translate view up, rotate counterclockwise with shift
            if (event.getModifierState("Shift"))
                Up = vec3.normalize(Up, vec3.add(Up, Up, vec3.scale(temp, viewRight, -viewDelta)));
            else {
                Eye = vec3.add(Eye, Eye, vec3.scale(temp, Up, viewDelta));
                Center = vec3.add(Center, Center, vec3.scale(temp, Up, viewDelta));
            } // end if shift not pressed
            break;
        case "KeyE": // translate view down, rotate clockwise with shift
            if (event.getModifierState("Shift"))
                Up = vec3.normalize(Up, vec3.add(Up, Up, vec3.scale(temp, viewRight, viewDelta)));
            else {
                Eye = vec3.add(Eye, Eye, vec3.scale(temp, Up, -viewDelta));
                Center = vec3.add(Center, Center, vec3.scale(temp, Up, -viewDelta));
            } // end if shift not pressed
            break;
        case "Escape": // reset view to default
            Eye = vec3.copy(Eye, defaultEye);
            Center = vec3.copy(Center, defaultCenter);
            Up = vec3.copy(Up, defaultUp);
            break;

        // lighting
        case "KeyM":
            lightMap = true;
            Blinn_Phong = false;
            break;
        case "KeyU":
            lightMap = false;
            Blinn_Phong = false;
            break;

        // model transformation
        case "KeyK": // translate left, rotate left with shift
            if (event.getModifierState("Shift"))
                rotateModel(Up, dirEnum.NEGATIVE);
            else
                translateModel(vec3.scale(temp, viewRight, viewDelta));
            break;
        case "Semicolon": // translate right, rotate right with shift
            if (event.getModifierState("Shift"))
                rotateModel(Up, dirEnum.POSITIVE);
            else
                translateModel(vec3.scale(temp, viewRight, -viewDelta));
            break;
        case "KeyL": // translate backward, rotate up with shift
            if (event.getModifierState("Shift"))
                rotateModel(viewRight, dirEnum.POSITIVE);
            else
                translateModel(vec3.scale(temp, lookAt, -viewDelta));
            break;
        case "KeyO": // translate forward, rotate down with shift
            if (event.getModifierState("Shift"))
                rotateModel(viewRight, dirEnum.NEGATIVE);
            else
                translateModel(vec3.scale(temp, lookAt, viewDelta));
            break;
        case "KeyI": // translate up, rotate counterclockwise with shift
            if (event.getModifierState("Shift"))
                rotateModel(lookAt, dirEnum.POSITIVE);
            else
                translateModel(vec3.scale(temp, Up, viewDelta));
            break;
        case "KeyP": // translate down, rotate clockwise with shift
            if (event.getModifierState("Shift"))
                rotateModel(lookAt, dirEnum.NEGATIVE);
            else
                translateModel(vec3.scale(temp, Up, -viewDelta));
            break;
        case "KeyB":
            Blinn_Phong = !Blinn_Phong;
            break;
        case "KeyN":
            handleKeyDown.modelOn.material.n = (handleKeyDown.modelOn.material.n + 1) % 20;
            console.log(handleKeyDown.modelOn.material.n);
            break;
        case "Numpad1":
            vec3.add(handleKeyDown.modelOn.material.ambient, handleKeyDown.modelOn.material.ambient, vec3.fromValues(0.1, 0.1, 0.1));
            if (handleKeyDown.modelOn.material.ambient[0] > 1.0)
                handleKeyDown.modelOn.material.ambient[0] = 0;
            if (handleKeyDown.modelOn.material.ambient[1] > 1.0)
                handleKeyDown.modelOn.material.ambient[1] = 0;
            if (handleKeyDown.modelOn.material.ambient[2] > 1.0)
                handleKeyDown.modelOn.material.ambient[2] = 0;
            console.log(handleKeyDown.modelOn.material.ambient);
            break;
        case "Numpad2":
            vec3.add(handleKeyDown.modelOn.material.diffuse, handleKeyDown.modelOn.material.diffuse, vec3.fromValues(0.1, 0.1, 0.1));
            if (handleKeyDown.modelOn.material.diffuse[0] > 1.0)
                handleKeyDown.modelOn.material.diffuse[0] = 0;
            if (handleKeyDown.modelOn.material.diffuse[1] > 1.0)
                handleKeyDown.modelOn.material.diffuse[1] = 0;
            if (handleKeyDown.modelOn.material.diffuse[2] > 1.0)
                handleKeyDown.modelOn.material.diffuse[2] = 0;
            console.log(handleKeyDown.modelOn.material.diffuse);
            break;
        case "Numpad3":
            vec3.add(handleKeyDown.modelOn.material.specular, handleKeyDown.modelOn.material.specular, vec3.fromValues(0.1, 0.1, 0.1));
            if (handleKeyDown.modelOn.material.specular[0] > 1.0)
                handleKeyDown.modelOn.material.specular[0] = 0;
            if (handleKeyDown.modelOn.material.specular[1] > 1.0)
                handleKeyDown.modelOn.material.specular[1] = 0;
            if (handleKeyDown.modelOn.material.specular[2] > 1.0)
                handleKeyDown.modelOn.material.specular[2] = 0;
            console.log(handleKeyDown.modelOn.material.specular);
            break;
        case "Backspace": // reset model transforms to default
            for (var whichTriSet = 0; whichTriSet < numTriangleSets; whichTriSet++) {
                vec3.set(inputTriangles[whichTriSet].translation, 0, 0, 0);
                vec3.set(inputTriangles[whichTriSet].xAxis, 1, 0, 0);
                vec3.set(inputTriangles[whichTriSet].yAxis, 0, 1, 0);
            } // end for all triangle sets
            for (var whichEllipsoid = 0; whichEllipsoid < numEllipsoids; whichEllipsoid++) {
                vec3.set(inputEllipsoids[whichEllipsoid].translation, 0, 0, 0);
                vec3.set(inputEllipsoids[whichTriSet].xAxis, 1, 0, 0);
                vec3.set(inputEllipsoids[whichTriSet].yAxis, 0, 1, 0);
            } // end for all ellipsoids
            break;
    } // end switch
} // end handleKeyDown

// set up the webGL environment
function setupWebGL() {
    // Set up keys
    document.onkeydown = handleKeyDown; // call this when key pressed
    // Get the image canvas, render an image in it
    var imageCanvas = document.getElementById("myImageCanvas"); // create a 2d canvas
    var cw = imageCanvas.width, ch = imageCanvas.height;
    imageContext = imageCanvas.getContext("2d");
    var bkgdImage = new Image();
    bkgdImage.crossOrigin = "Anonymous";
    bkgdImage.src = "https://ncsucgclass.github.io/prog4/sky.jpg";
    bkgdImage.onload = function () {
        var iw = bkgdImage.width, ih = bkgdImage.height;
        imageContext.drawImage(bkgdImage, 0, 0, iw, ih, 0, 0, cw, ch);
    } // end onload callback

    // create a webgl canvas and set it up
    var webGLCanvas = document.getElementById("myWebGLCanvas"); // create a webgl canvas
    gl = webGLCanvas.getContext("webgl"); // get a webgl object from it
    try {
        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {
            //gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
            gl.clearDepth(1.0); // use max when we clear the depth buffer
            gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
        }
    } // end try


    catch (e) {
        console.log(e);
    } // end catch

} // end setupWebGL

// read models in, load them into webgl buffers
function loadModels() {

    lightMapTexture = getTexture(LIGHTMAP_URL);

    inputTriangles = getJSONFile(INPUT_TRIANGLES_URL, "triangles"); // read in the triangle data
    inputTriangles = [
        // floor
        {
            "class": "env",
            "material": {
                "ambient": [0.0, 0.0, 0.0],
                "diffuse": [0.0, 0.0, 0.0],
                "specular": [0.0, 0.0, 0.0],
                "n": 17,
                "alpha": 1.0,
                "texture": null
            },
            "vertices": [[1.0, 0.0, -1.0], [1.0, 0.0, 1.0], [-1.0, 0.0, 1.0], [-1.0, 0.0, -1.0]],
            "normals": [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]],
            "uvs": [[0, 0], [0, 1], [1, 1], [1, 0]],
            "triangles": [[0, 1, 2], [2, 3, 0]]
        },
        // back wall
        {
            "class": "env",
            "material": {
                "ambient": [1.0, 1.0, 1.0],
                "diffuse": [0.6, 0.6, 0.4],
                "specular": [0.3, 0.3, 0.3],
                "n": 15,
                "alpha": 1.0,
                "texture": "wall.jpg"
            },
            "vertices": [[1.0, 0.0, 1.0], [1.0, 0.15, 1.0], [-1.0, 0.15, 1.0], [-1.0, 0.0, 1.0], [1.0, 0.15, 1.1], [-1.0, 0.15, 1.1]],
            "normals": [[0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]],
            "uvs": [[0, 0], [0, 0.3], [1, 0.3], [1, 0], [0, 0.4], [1, 0.4]],
            "triangles": [[0, 1, 2], [2, 3, 0], [1, 4, 5], [5, 2, 1]]
        },
        // back barrier
        {
            "class": "env",
            "material": {
                "ambient": [1.0, 1.0, 1.0],
                "diffuse": [0.6, 0.6, 0.4],
                "specular": [0.3, 0.3, 0.3],
                "n": 15,
                "alpha": 1.0,
                "texture": "wall.jpg"
            },
            "vertices": [[0.05, 0.0, 0.4], [0.05, 0.0, 1.0], [-0.05, 0.0, 1.0], [-0.05, 0.0, 0.4], [0.05, 0.15, 0.4], [0.05, 0.15, 1.0], [-0.05, 0.15, 1.0], [-0.05, 0.15, 0.4]],
            "normals": [[0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]],
            "uvs": [[0, 0], [0.8, 0], [0.8, 1.4], [0, 1.4], [0, 0.6], [0.8, 0.6], [0.8, 0.8], [0, 0.8]],
            "triangles": [[0, 1, 5], [5, 4, 0], [4, 5, 6], [6, 7, 4], [2, 3, 7], [7, 6, 2]]
        },
        // back barrier front
        {
            "class": "env",
            "material": {
                "ambient": [1.0, 1.0, 1.0],
                "diffuse": [0.6, 0.6, 0.4],
                "specular": [0.3, 0.3, 0.3],
                "n": 15,
                "alpha": 1.0,
                "texture": "wall.jpg"
            },
            "vertices": [[0.05, 0.0, 0.4], [0.05, 0.15, 0.4], [-0.05, 0.15, 0.4], [-0.05, 0.0, 0.4]],
            "normals": [[0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]],
            "uvs": [[0, 0], [0.6, 0], [0.6, 0.2], [0, 0.2]],
            "triangles": [[0, 1, 2], [2, 3, 0]]
        },
        // front wall
        {
            "class": "env",
            "material": {
                "ambient": [1.0, 1.0, 1.0],
                "diffuse": [0.6, 0.6, 0.4],
                "specular": [0.3, 0.3, 0.3],
                "n": 15,
                "alpha": 1.0,
                "texture": "wall.jpg"
            },
            "vertices": [[1.0, 0.0, -1.0], [1.0, 0.15, -1.0], [-1.0, 0.15, -1.0], [-1.0, 0.0, -1.0], [1.0, 0.15, -1.1], [-1.0, 0.15, -1.1]],
            "normals": [[0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]],
            "uvs": [[0, 0], [0, 0.3], [1, 0.3], [1, 0], [0, 0.4], [1, 0.4]],
            "triangles": [[0, 1, 2], [2, 3, 0], [1, 4, 5], [5, 2, 1]]
        },
        // front barrier
        {
            "class": "env",
            "material": {
                "ambient": [1.0, 1.0, 1.0],
                "diffuse": [0.6, 0.6, 0.4],
                "specular": [0.3, 0.3, 0.3],
                "n": 15,
                "alpha": 1.0,
                "texture": "wall.jpg"
            },
            "vertices": [[0.05, 0.0, -0.4], [0.05, 0.0, -1.0], [-0.05, 0.0, -1.0], [-0.05, 0.0, -0.4], [0.05, 0.15, -0.4], [0.05, 0.15, -1.0], [-0.05, 0.15, -1.0], [-0.05, 0.15, -0.4]],
            "normals": [[0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]],
            "uvs": [[0, 0], [0.8, 0], [0.8, 1.4], [0, 1.4], [0, 0.6], [0.8, 0.6], [0.8, 0.8], [0, 0.8]],
            "triangles": [[0, 1, 5], [5, 4, 0], [4, 5, 6], [6, 7, 4], [2, 3, 7], [7, 6, 2]]
        },
        // back barrier front
        {
            "class": "env",
            "material": {
                "ambient": [1.0, 1.0, 1.0],
                "diffuse": [0.6, 0.6, 0.4],
                "specular": [0.3, 0.3, 0.3],
                "n": 15,
                "alpha": 1.0,
                "texture": "wall.jpg"
            },
            "vertices": [[0.05, 0.0, -0.4], [0.05, 0.15, -0.4], [-0.05, 0.15, -0.4], [-0.05, 0.0, -0.4]],
            "normals": [[0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]],
            "uvs": [[0, 0], [0.6, 0], [0.6, 0.2], [0, 0.2]],
            "triangles": [[0, 1, 2], [2, 3, 0]]
        },
        // left wall
        {
            "class": "env",
            "material": {
                "ambient": [1.0, 1.0, 1.0],
                "diffuse": [0.6, 0.6, 0.4],
                "specular": [0.3, 0.3, 0.3],
                "n": 15,
                "alpha": 1.0,
                "texture": "wall.jpg"
            },
            "vertices": [[-1.0, 0.0, -1.1], [-1.0, 0.15, -1.1], [-1.1, 0.15, -1.1], [-1.0, 0.0, 1.1], [-1.0, 0.15, 1.1], [-1.1, 0.15, 1.1]],
            "normals": [[0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]],
            "uvs": [[0, 0], [0, 0.3], [0, 0.5], [4.4, 0], [4.4, 0.3], [4.4, 0.5]],
            "triangles": [[0, 3, 4], [4, 1, 0], [1, 4, 5], [5, 2, 1]]
        },
        // left wall
        {
            "class": "env",
            "material": {
                "ambient": [1.0, 1.0, 1.0],
                "diffuse": [0.6, 0.6, 0.4],
                "specular": [0.3, 0.3, 0.3],
                "n": 15,
                "alpha": 1.0,
                "texture": "wall.jpg"
            },
            "vertices": [[1.0, 0.0, -1.1], [1.0, 0.15, -1.1], [1.1, 0.15, -1.1], [1.0, 0.0, 1.1], [1.0, 0.15, 1.1], [1.1, 0.15, 1.1]],
            "normals": [[0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]],
            "uvs": [[0, 0], [0, 0.3], [0, 0.5], [4.4, 0], [4.4, 0.3], [4.4, 0.5]],
            "triangles": [[0, 3, 4], [4, 1, 0], [1, 4, 5], [5, 2, 1]]
        },
        // player
        {
            "class": "player",
            "material": {
                "ambient": [0.5, 0.0, 0.0],
                "diffuse": [1.0, 1.0, 1.0],
                "specular": [1.0, 1.0, 1.0],
                "n": 31,
                "alpha": 0.99,
                "texture": null
            },
            "vertices": [[0.5, 0.0, 0.0], [0.4, 0.0, 0.0], [0.4, 0.0, 0.1], [0.5, 0.0, 0.1],
                [0.5, 0.1, 0.0], [0.4, 0.1, 0.0], [0.4, 0.1, 0.1], [0.5, 0.1, 0.1]],
            "normals": [[0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]],
            "uvs": [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
            "triangles": [[3, 2, 1], [1, 0, 3], [4, 5, 6], [6, 7, 4], [0, 1, 5], [5, 4, 0], [3, 0, 4], [4, 7, 3], [1, 2, 6], [6, 5, 1], [2, 3, 7], [7, 6, 2]]
        },
    ];

    try {
        if (inputTriangles == String.null)
            throw "Unable to load triangles file!";
        else {
            var whichSetVert; // index of vertex in current triangle set
            var whichSetTri; // index of triangle in current triangle set
            var vtxToAdd; // vtx coords to add to the coord array
            var normToAdd; // vtx normal to add to the coord array
            var triToAdd; // tri indices to add to the index array
            var uvsToAdd;
            var maxCorner = vec3.fromValues(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE); // bbox corner
            var minCorner = vec3.fromValues(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE); // other corner

            // process each triangle set to load webgl vertex and triangle buffers
            numTriangleSets = inputTriangles.length; // remember how many tri sets
            for (var whichSet = 0; whichSet < numTriangleSets; whichSet++) { // for each tri set

                // set up hilighting, modeling translation and rotation
                inputTriangles[whichSet].center = vec3.fromValues(0, 0, 0);  // center point of tri set
                inputTriangles[whichSet].on = false; // not highlighted
                inputTriangles[whichSet].translation = vec3.fromValues(0, 0, 0); // no translation
                inputTriangles[whichSet].xAxis = vec3.fromValues(1, 0, 0); // model X axis
                inputTriangles[whichSet].yAxis = vec3.fromValues(0, 1, 0); // model Y axis
                inputTriangles[whichSet].texture = getTexture(URL + inputTriangles[whichSet].material.texture);
                if (inputTriangles[whichSet].material.alpha === 1) {
                    triIndex[0].push(whichSet);
                } else {
                    triIndex[1].push(whichSet);
                }


                // set up the vertex and normal arrays, define model center and axes
                inputTriangles[whichSet].glVertices = []; // flat coord list for webgl
                inputTriangles[whichSet].glNormals = []; // flat normal list for webgl
                inputTriangles[whichSet].glUvs = [];
                var numVerts = inputTriangles[whichSet].vertices.length; // num vertices in tri set
                for (whichSetVert = 0; whichSetVert < numVerts; whichSetVert++) { // verts in set
                    vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert]; // get vertex to add
                    normToAdd = inputTriangles[whichSet].normals[whichSetVert]; // get normal to add
                    uvsToAdd = inputTriangles[whichSet].uvs[whichSetVert];
                    inputTriangles[whichSet].glVertices.push(vtxToAdd[0], vtxToAdd[1], vtxToAdd[2]); // put coords in set coord list
                    inputTriangles[whichSet].glNormals.push(normToAdd[0], normToAdd[1], normToAdd[2]); // put normal in set coord list
                    inputTriangles[whichSet].glUvs.push(uvsToAdd[0], uvsToAdd[1]); // put normal in set coord list
                    vec3.max(maxCorner, maxCorner, vtxToAdd); // update world bounding box corner maxima
                    vec3.min(minCorner, minCorner, vtxToAdd); // update world bounding box corner minima
                    vec3.add(inputTriangles[whichSet].center, inputTriangles[whichSet].center, vtxToAdd); // add to ctr sum
                } // end for vertices in set
                vec3.scale(inputTriangles[whichSet].center, inputTriangles[whichSet].center, 1 / numVerts); // avg ctr sum

                // send the vertex coords and normals to webGL
                vertexBuffers[whichSet] = gl.createBuffer(); // init empty webgl set vertex coord buffer
                gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[whichSet].glVertices), gl.STATIC_DRAW); // data in
                normalBuffers[whichSet] = gl.createBuffer(); // init empty webgl set normal component buffer
                gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[whichSet].glNormals), gl.STATIC_DRAW); // data in
                textureBuffers[whichSet] = gl.createBuffer(); // init empty webgl set normal component buffer
                gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[whichSet].glUvs), gl.STATIC_DRAW); // data in

                // set up the triangle index array, adjusting indices across sets
                inputTriangles[whichSet].glTriangles = []; // flat index list for webgl
                triSetSizes[whichSet] = inputTriangles[whichSet].triangles.length; // number of tris in this set
                for (whichSetTri = 0; whichSetTri < triSetSizes[whichSet]; whichSetTri++) {
                    triToAdd = inputTriangles[whichSet].triangles[whichSetTri]; // get tri to add
                    inputTriangles[whichSet].glTriangles.push(triToAdd[0], triToAdd[1], triToAdd[2]); // put indices in set list
                } // end for triangles in set

                // send the triangle indices to webGL
                triangleBuffers.push(gl.createBuffer()); // init empty triangle index buffer
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(inputTriangles[whichSet].glTriangles), gl.STATIC_DRAW); // data in

            } // end for each triangle set 
            var temp = vec3.create();
            viewDelta = vec3.length(vec3.subtract(temp, maxCorner, minCorner)) / 100; // set global
        } // end if triangle file loaded
    } // end try 

    catch (e) {
        console.log(e);
    } // end catch
} // end load models

function addBullet(pos, dirc, type) {
    if (type === "bullet") {
        var color = [127,255,0];
    } else {
        var color = [106,90,205];
    }
    var offset = [[0,0,0.1], [-0.1, 0, 0], [0, 0, -0.1], [0.1,0,0]];
    var center = [pos[0]-0.05, 0.05, pos[2]+0.05];
    var bCenter = center.map((v, i)=>offset[dirc][i]+v);
    var bPos = [bCenter[0]+0.0125, bCenter[1]-0.0125, bCenter[2]-0.0125];
    var bullet = {
        "class": "bullet",
        "dir": dirc,
        "material": {
            "ambient": color,
            "diffuse": color,
            "specular": color,
            "n": 15,
            "alpha": 1.0,
            "texture": null
        },
        "vertices": [[bPos[0], bPos[1],bPos[2]], [bPos[0]-0.025, bPos[1],bPos[2]], [bPos[0]-0.025, bPos[1],bPos[2]+0.025],[bPos[0], bPos[1],bPos[2]+0.025], [bPos[0], bPos[1]+0.025,bPos[2]], [bPos[0]-0.025, bPos[1]+0.025,bPos[2]], [bPos[0]-0.025, bPos[1]+0.025,bPos[2]+0.025],[bPos[0], bPos[1]+0.025,bPos[2]+0.025]],
        "normals": [[0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]],
        "uvs": [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
        "triangles": [[3, 2, 1], [1, 0, 3], [4, 5, 6], [6, 7, 4], [0, 1, 5], [5, 4, 0], [3, 0, 4], [4, 7, 3], [1, 2, 6], [6, 5, 1], [2, 3, 7], [7, 6, 2]]
    };

    var whichSetVert; // index of vertex in current triangle set
    var whichSetTri; // index of triangle in current triangle set
    var vtxToAdd; // vtx coords to add to the coord array
    var normToAdd; // vtx normal to add to the coord array
    var triToAdd; // tri indices to add to the index array
    var uvsToAdd;
    inputTriangles.push(bullet);
    var index = inputTriangles.length - 1;
    bulletInd.push(index);
    inputTriangles[index].center = vec3.fromValues(0, 0, 0);  // center point of tri set
    inputTriangles[index].on = false; // not highlighted
    inputTriangles[index].translation = vec3.fromValues(0, 0, 0); // no translation
    inputTriangles[index].xAxis = vec3.fromValues(1, 0, 0); // model X axis
    inputTriangles[index].yAxis = vec3.fromValues(0, 1, 0); // model Y axis
    inputTriangles[index].texture = getTexture(URL + inputTriangles[index].material.texture);
    if (inputTriangles[index].material.alpha === 1) {
        triIndex[0].push(index);
    } else {
        triIndex[1].push(index);
    }
    inputTriangles[index].glVertices = []; // flat coord list for webgl
    inputTriangles[index].glNormals = []; // flat normal list for webgl
    inputTriangles[index].glUvs = [];
    var numVerts = inputTriangles[index].vertices.length; // num vertices in tri set
    for (whichSetVert = 0; whichSetVert < numVerts; whichSetVert++) { // verts in set
        vtxToAdd = inputTriangles[index].vertices[whichSetVert]; // get vertex to add
        normToAdd = inputTriangles[index].normals[whichSetVert]; // get normal to add
        uvsToAdd = inputTriangles[index].uvs[whichSetVert];
        inputTriangles[index].glVertices.push(vtxToAdd[0], vtxToAdd[1], vtxToAdd[2]); // put coords in set coord list
        inputTriangles[index].glNormals.push(normToAdd[0], normToAdd[1], normToAdd[2]); // put normal in set coord list
        inputTriangles[index].glUvs.push(uvsToAdd[0], uvsToAdd[1]); // put normal in set coord list
        vec3.add(inputTriangles[index].center, inputTriangles[index].center, vtxToAdd); // add to ctr sum
    } // end for vertices in set
    vec3.scale(inputTriangles[index].center, inputTriangles[index].center, 1 / numVerts); // avg ctr sum

    // send the vertex coords and normals to webGL
    vertexBuffers[index] = gl.createBuffer(); // init empty webgl set vertex coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[index]); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[index].glVertices), gl.STATIC_DRAW); // data in
    normalBuffers[index] = gl.createBuffer(); // init empty webgl set normal component buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffers[index]); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[index].glNormals), gl.STATIC_DRAW); // data in
    textureBuffers[index] = gl.createBuffer(); // init empty webgl set normal component buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffers[index]); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[index].glUvs), gl.STATIC_DRAW); // data in

    // set up the triangle index array, adjusting indices across sets
    inputTriangles[index].glTriangles = []; // flat index list for webgl
    triSetSizes[index] = inputTriangles[index].triangles.length; // number of tris in this set
    for (whichSetTri = 0; whichSetTri < triSetSizes[index]; whichSetTri++) {
        triToAdd = inputTriangles[index].triangles[whichSetTri]; // get tri to add
        inputTriangles[index].glTriangles.push(triToAdd[0], triToAdd[1], triToAdd[2]); // put indices in set list
    } // end for triangles in set

    // send the triangle indices to webGL
    triangleBuffers.push(gl.createBuffer()); // init empty triangle index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[index]); // activate that buffer
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(inputTriangles[index].glTriangles), gl.STATIC_DRAW); // data in
}

function removeBullet(index) {
    delete inputTriangles[index];
    for (var i = 0; i < bulletInd.length; i++) {
        if (bulletInd[i] === index) {
            bulletInd.splice(i, 1);
            break;
        }
    }
}

function killEnemy(index) {

}

function bulletBeh() {
    offset = [[0.0, 0.0, bSpeed], [-bSpeed, 0.0, 0.0], [0.0, 0.0, -bSpeed], [bSpeed, 0.0, 0.0]];
    for (var index of bulletInd) {
        vec3.add(inputTriangles[index].translation, inputTriangles[index].translation, offset[inputTriangles[index].dir]);
    }
}
// setup the webGL shaders
function setupShaders() {

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 aVertexPosition; // vertex position
        attribute vec3 aVertexNormal; // vertex normal
        attribute vec2 aTexCoord;
        
        uniform mat4 umMatrix; // the model matrix
        uniform mat4 upvmMatrix; // the project view model matrix
        
        varying vec3 vWorldPos; // interpolated world position of vertex
        varying vec3 vVertexNormal; // interpolated normal for frag shader
        varying vec2 vTexCoord;

        void main(void) {
            
            // vertex position
            vec4 vWorldPos4 = umMatrix * vec4(aVertexPosition, 1.0);
            vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
            gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);

            // vertex normal (assume no non-uniform scale)
            vec4 vWorldNormal4 = umMatrix * vec4(aVertexNormal, 0.0);
            vVertexNormal = normalize(vec3(vWorldNormal4.x,vWorldNormal4.y,vWorldNormal4.z)); 
            
            // vec2.rotate(vTexCoord, aTexCoord, vec2(0.5, 0.5), 180);
            vTexCoord = aTexCoord * vec2(-1.0, -1.0);
        }
    `;

    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float; // set float to medium precision

        // eye location
        uniform vec3 uEyePosition; // the eye's position in world
        
        // light properties
        uniform vec3 uLightAmbient; // the light's ambient color
        uniform vec3 uLightDiffuse; // the light's diffuse color
        uniform vec3 uLightSpecular; // the light's specular color
        uniform vec3 uLightPosition; // the light's position
        
        // material properties
        uniform vec3 uAmbient; // the ambient reflectivity
        uniform vec3 uDiffuse; // the diffuse reflectivity
        uniform vec3 uSpecular; // the specular reflectivity
        uniform float uShininess; // the specular exponent
        uniform bool Blinn_Phong;  // Blinn_Phong x Phong toggle
        uniform sampler2D u_texture;
        uniform sampler2D lightMapTexture;
        uniform bool lightMap;
        uniform float uAlpha;
        
        // geometry properties
        varying vec3 vWorldPos; // world xyz of fragment
        varying vec3 vVertexNormal; // normal of fragment
        
        varying vec2 vTexCoord;
            
        void main(void) {
        
            // ambient term
            vec3 ambient = uAmbient*uLightAmbient; 
            
            // diffuse term
            vec3 normal = normalize(vVertexNormal); 
            vec3 light = normalize(uLightPosition - vWorldPos);
            float lambert = max(0.0,dot(normal,light));
            vec3 diffuse = uDiffuse*uLightDiffuse*lambert; // diffuse term
            
            // specular term
            vec3 eye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(light+eye);
            float ndotLight = 2.0*dot(normal, light);
            vec3 reflectVec = normalize(ndotLight*normal - light);
            float highlight = 0.0;
            if(Blinn_Phong)
           	 	highlight = pow(max(0.0,dot(normal,halfVec)),uShininess);
           	else 
           		highlight = pow(max(0.0,dot(normal,reflectVec)),uShininess);

            vec3 specular = uSpecular*uLightSpecular*highlight; // specular term
            
            // combine to output color
            vec3 colorOut = ambient + diffuse + specular; // no specular yet
            
            vec4 tColor = texture2D(u_texture, vTexCoord);
            vec4 lightColor = tColor * texture2D(lightMapTexture, vTexCoord);
            if(Blinn_Phong) {
                // gl_FragColor = texture2D(u_texture, vTexCoord) * vec4(colorOut, tColor.a * uAlpha);
                gl_FragColor = vec4(tColor.rgb * colorOut, tColor.a * uAlpha);
            } else {
                if(lightMap)
                    gl_FragColor = vec4(lightColor.rgb, lightColor.a * uAlpha);
                else
                    gl_FragColor = tColor;
            }
        }
    `;

    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader, fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader, vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)

                // locate and enable vertex attributes
                vPosAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition"); // ptr to vertex pos attrib
                gl.enableVertexAttribArray(vPosAttribLoc); // connect attrib to array
                vNormAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexNormal"); // ptr to vertex normal attrib
                gl.enableVertexAttribArray(vNormAttribLoc); // connect attrib to array
                vTexCoordLoc = gl.getAttribLocation(shaderProgram, "aTexCoord");
                gl.enableVertexAttribArray(vTexCoordLoc); // connect attrib to array

                // locate vertex uniforms
                mMatrixULoc = gl.getUniformLocation(shaderProgram, "umMatrix"); // ptr to mmat
                pvmMatrixULoc = gl.getUniformLocation(shaderProgram, "upvmMatrix"); // ptr to pvmmat

                // lighting
                textureULoc = gl.getUniformLocation(shaderProgram, "u_texture");
                lightMapTextureULoc = gl.getUniformLocation(shaderProgram, "lightMapTexture"); // ptr to eye position
                lightMapULoc = gl.getUniformLocation(shaderProgram, "lightMap");
                alphaULoc = gl.getUniformLocation(shaderProgram, "uAlpha");

                // locate fragment uniforms
                var eyePositionULoc = gl.getUniformLocation(shaderProgram, "uEyePosition"); // ptr to eye position
                var lightAmbientULoc = gl.getUniformLocation(shaderProgram, "uLightAmbient"); // ptr to light ambient
                var lightDiffuseULoc = gl.getUniformLocation(shaderProgram, "uLightDiffuse"); // ptr to light diffuse
                var lightSpecularULoc = gl.getUniformLocation(shaderProgram, "uLightSpecular"); // ptr to light specular
                var lightPositionULoc = gl.getUniformLocation(shaderProgram, "uLightPosition"); // ptr to light position
                ambientULoc = gl.getUniformLocation(shaderProgram, "uAmbient"); // ptr to ambient
                diffuseULoc = gl.getUniformLocation(shaderProgram, "uDiffuse"); // ptr to diffuse
                specularULoc = gl.getUniformLocation(shaderProgram, "uSpecular"); // ptr to specular
                shininessULoc = gl.getUniformLocation(shaderProgram, "uShininess"); // ptr to shininess
                Blinn_PhongULoc = gl.getUniformLocation(shaderProgram, "Blinn_Phong");
                // pass global constants into fragment uniforms
                gl.uniform3fv(eyePositionULoc, Eye); // pass in the eye's position
                gl.uniform3fv(lightAmbientULoc, lightAmbient); // pass in the light's ambient emission
                gl.uniform3fv(lightDiffuseULoc, lightDiffuse); // pass in the light's diffuse emission
                gl.uniform3fv(lightSpecularULoc, lightSpecular); // pass in the light's specular emission
                gl.uniform3fv(lightPositionULoc, lightPosition); // pass in the light's position
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 

    catch (e) {
        console.log(e);
    } // end catch
} // end setup shaders

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function getTexture(imageUrl) {
    var texture = gl.createTexture();
    var image = new Image();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // pre fill with blue pixel
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255]));
    image.crossOrigin = "Anonymous";
    image.src = imageUrl;
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        // Check if the image is a power of 2 in both dimensions.
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            // No, it's not a power of 2. Turn off mips and set wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    return texture;
}

// render the loaded model
function renderModels() {

    bulletBeh();

    // construct the model transform matrix, based on model state
    function makeModelTransform(currModel) {
        var zAxis = vec3.create(), sumRotation = mat4.create(), temp = mat4.create(), negCtr = vec3.create();

        // move the model to the origin
        mat4.fromTranslation(mMatrix, vec3.negate(negCtr, currModel.center));

        // scale for highlighting if needed
        // if (currModel.on)
        //     mat4.multiply(mMatrix, mat4.fromScaling(temp, vec3.fromValues(1.2, 1.2, 1.2)), mMatrix); // S(1.2) * T(-ctr)

        // rotate the model to current interactive orientation
        vec3.normalize(zAxis, vec3.cross(zAxis, currModel.xAxis, currModel.yAxis)); // get the new model z axis
        mat4.set(sumRotation, // get the composite rotation
            currModel.xAxis[0], currModel.yAxis[0], zAxis[0], 0,
            currModel.xAxis[1], currModel.yAxis[1], zAxis[1], 0,
            currModel.xAxis[2], currModel.yAxis[2], zAxis[2], 0,
            0, 0, 0, 1);
        mat4.multiply(mMatrix, sumRotation, mMatrix); // R(ax) * S(1.2) * T(-ctr)

        // translate back to model center
        mat4.multiply(mMatrix, mat4.fromTranslation(temp, currModel.center), mMatrix); // T(ctr) * R(ax) * S(1.2) * T(-ctr)

        // translate model to current interactive orientation
        mat4.multiply(mMatrix, mat4.fromTranslation(temp, currModel.translation), mMatrix); // T(pos)*T(ctr)*R(ax)*S(1.2)*T(-ctr)

    } // end make model transform

    // var hMatrix = mat4.create(); // handedness matrix
    var pMatrix = mat4.create(); // projection matrix
    var vMatrix = mat4.create(); // view matrix
    var mMatrix = mat4.create(); // model matrix
    var pvMatrix = mat4.create(); // hand * proj * view matrices
    var pvmMatrix = mat4.create(); // hand * proj * view * model matrices

    window.requestAnimationFrame(renderModels); // set up frame render callback

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    // set up projection and view
    // mat4.fromScaling(hMatrix,vec3.fromValues(-1,1,1)); // create handedness matrix
    if (isPerspectiveProjection)
        mat4.perspective(pMatrix, 0.5 * Math.PI, 1, 0.1, 10); // create projection matrix
    else
        mat4.ortho(pMatrix, -1.1, 1.1, -1.0, 1.0, 0.1, 10);
    mat4.lookAt(vMatrix, Eye, Center, Up); // create view matrix
    mat4.multiply(pvMatrix, pvMatrix, pMatrix); // projection
    mat4.multiply(pvMatrix, pvMatrix, vMatrix); // projection * view

    triIndex[1].sort(function (x, y) {
        var temp = mat4.create();
        var x_trans = mat4.fromTranslation(temp, inputTriangles[x].translation);
        temp = mat4.create();
        var y_trans = mat4.fromTranslation(temp, inputTriangles[y].translation);
        temp = vec3.create();
        var x_dis = vec3.distance(vec3.transformMat4(temp, inputTriangles[x].center, x_trans), defaultEye);
        temp = vec3.create();
        var y_dis = vec3.distance(vec3.transformMat4(temp, inputTriangles[y].center, y_trans), defaultEye);
        if (x_dis < y_dis) {
            return -1;
        }
        if (x_dis > y_dis) {
            return 1;
        }
        return 0;
    });

    gl.disable(gl.BLEND);
    gl.depthMask(true);
    // render each triangle set
    var currSet; // the tri set and its material properties
    for (var round = 0; round < 2; round++) {
        for (var i = 0; i < triIndex[round].length; i++) {
            var whichTriSet = triIndex[round][i];
            currSet = inputTriangles[whichTriSet];
            if (typeof(currSet) === "undefined") {
                continue;
            }

            if (currSet.class !== "env") {
                var temp = vec3.create();
                var pos = vec3.add(temp, currSet.translation, currSet['vertices'][0]);
                if (hitWalls(pos, currSet["class"])) {
                    if (currSet["class"] === "player") {
                        gameOver = true;
                    }
                    if (currSet["class"] === "bullet") {
                        removeBullet(whichTriSet);
                    }
                }
            }
            if ((round === 0 && currSet.material.alpha !== 1) || (round === 1 && currSet.material.alpha === 1)) {
                continue;
            }

            // make model transform, add to view project
            makeModelTransform(currSet);
            mat4.multiply(pvmMatrix, pvMatrix, mMatrix); // project * view * model
            gl.uniformMatrix4fv(mMatrixULoc, false, mMatrix); // pass in the m matrix
            gl.uniformMatrix4fv(pvmMatrixULoc, false, pvmMatrix); // pass in the hpvm matrix

            // reflectivity: feed to the fragment shader
            gl.uniform3fv(ambientULoc, currSet.material.ambient); // pass in the ambient reflectivity
            gl.uniform3fv(diffuseULoc, currSet.material.diffuse); // pass in the diffuse reflectivity
            gl.uniform3fv(specularULoc, currSet.material.specular); // pass in the specular reflectivity
            gl.uniform1f(shininessULoc, currSet.material.n); // pass in the specular exponent
            gl.uniform1i(Blinn_PhongULoc, Blinn_Phong);
            gl.uniform1i(lightMapULoc, lightMap);
            gl.uniform1f(alphaULoc, currSet.material.alpha);
            // gl.uniform1f(alphaULoc, 1.0);

            // vertex buffer: activate and feed into vertex shader
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[whichTriSet]); // activate
            gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffers[whichTriSet]); // activate
            gl.vertexAttribPointer(vNormAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed
            gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffers[whichTriSet]);
            gl.vertexAttribPointer(vTexCoordLoc, 2, gl.FLOAT, false, 0, 0);

            // lightmap
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, lightMapTexture);
            gl.uniform1i(lightMapTextureULoc, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, currSet.texture);
            gl.uniform1i(textureULoc, 1);

            if (round === 1) {
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                gl.enable(gl.BLEND);
                gl.depthMask(false);
            }

            // triangle buffer: activate and render
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichTriSet]); // activate
            gl.drawElements(gl.TRIANGLES, 3 * triSetSizes[whichTriSet], gl.UNSIGNED_SHORT, 0); // render

        } // end for each triangle set
    }
} // end render model

function hitWalls(pos, type) {
    // left wall
    const offset = {"player": 0.1, "enemy":0.1, "bullet": 0.05};
    if (pos[0] > 1.0) {
        return true;
    }
    // right wall
    if (pos[0] - offset[type] < -1.0) {
        return true;
    }
    if (pos[2] < -1.001) {
        return true;
    }
    if (pos[2] + offset[type] > 1.0) {
        return true;
    }
    if (0.05+offset[type] > pos[0] && pos[0] > -0.06 && (pos[2] > 0.20001+offset[type] || pos[2] < -0.4)) {
        return true;
    }
    return false;
}

/* MAIN -- HERE is where execution begins after window load */

function main() {

    setupWebGL(); // set up the webGL environment
    loadModels(); // load in the models from tri file
    setupShaders(); // setup the webGL shaders
    renderModels(); // draw the triangles using webGL

} // end main
