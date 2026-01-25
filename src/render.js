// Get the canvas element from the HTML
const canvas = document.getElementById("renderCanvas");

// Create the Babylon engine
const engine = new BABYLON.Engine(canvas, true);

// Create the scene
const createScene = () => {
    const scene = new BABYLON.Scene(engine);

    // Background color (dark gray/blue)
    scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1);

    // Camera
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        Math.PI / 2,
        Math.PI / 2.5,
        6,
        BABYLON.Vector3.Zero(),
        scene
    );
    camera.attachControl(canvas, true);

    // Light
    const light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    light.intensity = 0.9;

    // Sphere
    const sphere = BABYLON.MeshBuilder.CreateSphere(
        "sphere",
        { diameter: 1 },
        scene
    );
    sphere.position.y = 0.5;

    // Ground
    const ground = BABYLON.MeshBuilder.CreateGround(
        "ground",
        { width: 10, height: 10 },
        scene
    );

    return scene;
};

// Create the scene
const scene = createScene();

// Render loop
engine.runRenderLoop(() => {
    scene.render();
});

// Resize handling
window.addEventListener("resize", () => {
    engine.resize();
}); 