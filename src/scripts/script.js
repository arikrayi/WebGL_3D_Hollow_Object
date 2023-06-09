const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl");
var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
var vertexShader = gl.createShader(gl.VERTEX_SHADER);
const program = gl.createProgram();
var positionAttributeLocation = null
var colorAttributeLocation = null
var uProjectionMatrixUniformLocation = null
var current = {}

const shaderVertex = `
    attribute vec3 position;
    attribute vec3 color;

    uniform mat4 uProjectionMatrix;

    varying vec4 vColor;
    varying vec4 vFlatColor;

    void main(void) {
        vec4 projectedPos = uProjectionMatrix * vec4(position, 1.0);
        
        gl_Position = projectedPos;

        vColor = vec4(pow(min(max((1.6 - position.z) / 2.0, 0.0), 1.0), 2.2) * color, 1.0);
        vFlatColor = vec4(color, 1.0);
    }
`

const shaderFragment = `
    precision mediump float;
    varying vec4 vColor;
    void main(void) {
        gl_FragColor = vColor;
    }
`

const flatShaderFragment = `
    precision mediump float;
    varying vec4 vFlatColor;
    void main(void) {
        gl_FragColor = vFlatColor;
    }
`

function main() {
    resetCanvas(null);
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    initializeProgram();
}

function initializeProgram() {
    vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, shaderVertex);
    gl.compileShader(vertexShader);
    gl.attachShader(program, vertexShader);

    fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, current.shader ? shaderFragment : flatShaderFragment);
    gl.compileShader(fragmentShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    gl.useProgram(program);

    positionAttributeLocation = gl.getAttribLocation(program, "position");
    colorAttributeLocation = gl.getAttribLocation(program, "color");
    uProjectionMatrixUniformLocation = gl.getUniformLocation(program, "uProjectionMatrix");

    requestAnimationFrame(render);
}

function resetCanvas(currentModel) {
    current = {
        model: currentModel ? currentModel : loadModel("cube"),
        transformation: {
            translation: [0, 0, 0],
            rotation   : [0, 0, 0],
            scale      : 1.00,
        },
        view: {
            rotation: [0, 0, 0],
            radius: 0,
        },
        shader: true,
        projection: "orthographic",
        oblique: {
            theta: 105,
            phi: 105,
        },
        perspective: {
            fov: degToRad(90),
            near: 0.1,
            far: 2,
        },
        mouse: {
            dragging: false,
            origin: {x: undefined, y: undefined},
            delta: {x: 0, y: 0},
        },
        animation: {
            enabled: false,
            speed: [60, 30, 15],
        }
    }
    syncToolsFromCurrent();
}

function computeTransformMatrix() {
    var transformMatrix;
    var translation = current.transformation.translation;
    var rotation = current.transformation.rotation;
    var scale = current.transformation.scale;

    transformMatrix = createTranslationMatrix(translation[0], translation[1], translation[2]);
    transformMatrix = matrixMult4x4(transformMatrix, createRotationMatrix(rotation[0], rotation[1], rotation[2]));
    transformMatrix = matrixMult4x4(transformMatrix, createScaleMatrix(scale));
    return transformMatrix;
}

function computeViewMatrix() {
    var viewMatrix;

    viewMatrix = createRotationMatrix(current.view.rotation[0], current.view.rotation[1], current.view.rotation[2]);
    viewMatrix = matrixMult4x4(viewMatrix, createCamTranslationMatrix(current.view.radius));

    if (current.projection === "orthographic") {
        return matrixMult4x4(identityMatrix, viewMatrix);
    } else if (current.projection === "oblique") {
        return matrixMult4x4(obliqueMatrix(current.oblique.theta, current.oblique.phi), viewMatrix);
    } else if (current.projection === "perspective") {
        return matrixMult4x4(perspectiveMatrix(current.perspective.fov, current.perspective.near, current.perspective.far), viewMatrix);
    }
}

function render() {
    transformedModel = applyTransformationToCurrentVertices();
    var vertexBuffer = gl.createBuffer();
    var indexBuffer  = gl.createBuffer();

    gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(transformedModel.vertices), gl.STATIC_DRAW);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 6*Float32Array.BYTES_PER_ELEMENT, 0);

    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.vertexAttribPointer(colorAttributeLocation, 3, gl.FLOAT, false, 6*Float32Array.BYTES_PER_ELEMENT, 3*Float32Array.BYTES_PER_ELEMENT);

    gl.uniformMatrix4fv(uProjectionMatrixUniformLocation, false, new Float32Array(computeViewMatrix()));

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(current.model.indices), gl.STATIC_DRAW);

    gl.drawElements(gl.TRIANGLES, current.model.indices.length, gl.UNSIGNED_SHORT, 0);
    window.requestAnimationFrame(render);
}

main();