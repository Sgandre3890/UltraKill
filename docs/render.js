/* ============================================================
   render.js — Babylon.js GLTF Viewer (multi-file support)
   ============================================================

   HOW MULTI-FILE GLTF LOADING WORKS
   ──────────────────────────────────
   A .gltf scene references external files by *relative filename*:
     - scene.bin        (binary geometry/animation buffer)
     - textures/mat.jpg (texture images)

   When loading from the browser there's no real filesystem, so we:
   1. Collect ALL dropped/selected files into a Map<filename, File>.
   2. Register every file into BABYLON.FilesInputStore under its
      bare filename (no path prefix). Babylon's GLTF loader resolves
      relative URIs by looking there first before making network requests.
   3. Load only the .gltf / .glb entry file via SceneLoader.

   For .glb everything is self-contained, so it just works as before.
   ============================================================ */

(() => {
    // ── DOM Refs ────────────────────────────────────────────────────────────
    const canvas       = document.getElementById("renderCanvas");
    const fileInput    = document.getElementById("fileInput");
    const sampleBtn    = document.getElementById("sampleBtn");
    const resetBtn     = document.getElementById("resetBtn");
    const dropOverlay  = document.getElementById("dropOverlay");
    const statusDot    = document.getElementById("statusDot");
    const statusText   = document.getElementById("statusText");
    const infoMeshes   = document.getElementById("infoMeshes");
    const infoAnims    = document.getElementById("infoAnims");
    const infoSize     = document.getElementById("infoSize");
    const animControls = document.getElementById("animControls");
    const animList     = document.getElementById("animList");

    // ── Engine & Scene ──────────────────────────────────────────────────────
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });
    const scene  = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.04, 0.04, 0.06, 1);

    // ── Camera ──────────────────────────────────────────────────────────────
    const camera = new BABYLON.ArcRotateCamera(
        "camera", -Math.PI / 2, Math.PI / 3, 5, BABYLON.Vector3.Zero(), scene
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 0.1;
    camera.upperRadiusLimit = 100;
    camera.wheelPrecision   = 50;
    camera.minZ             = 0.01;

    const defaultCamState = {
        alpha: camera.alpha, beta: camera.beta, radius: camera.radius
    };

    // ── Lighting ─────────────────────────────────────────────────────────────
    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.5;
    const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-1, -2, -1), scene);
    dir.intensity = 0.9;

    scene.environmentIntensity = 0.8;
    scene.createDefaultEnvironment({
        createGround: true,
        groundSize: 20,
        groundColor: new BABYLON.Color3(0.04, 0.04, 0.06),
        createSkybox: false,
    });

    // ── State ────────────────────────────────────────────────────────────────
    let currentMeshes   = [];
    let activeAnimGroup = null;
    let registeredUrls  = []; // object URLs we created, so we can revoke them

    // ── Status ───────────────────────────────────────────────────────────────
    function setStatus(msg, state = "idle") {
        statusText.textContent = msg;
        statusDot.className    = state; // idle | loading | ready | error
    }

    // ── Bounding Box ─────────────────────────────────────────────────────────
    function getBounds(meshes) {
        let min = new BABYLON.Vector3( Infinity,  Infinity,  Infinity);
        let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
        let valid = false;
        for (const m of meshes) {
            if (!m.getBoundingInfo) continue;
            const bi = m.getBoundingInfo();
            min   = BABYLON.Vector3.Minimize(min, bi.boundingBox.minimumWorld);
            max   = BABYLON.Vector3.Maximize(max, bi.boundingBox.maximumWorld);
            valid = true;
        }
        return valid ? { min, max } : null;
    }

    // ── Auto-frame Camera ─────────────────────────────────────────────────────
    function frameCamera(meshes) {
        const bounds = getBounds(meshes);
        if (!bounds) return;
        const center = BABYLON.Vector3.Center(bounds.min, bounds.max);
        const span   = bounds.max.subtract(bounds.min).length();
        camera.target = center;
        camera.radius = span * 1.6;
        camera.alpha  = -Math.PI / 2;
        camera.beta   = Math.PI / 3;
    }

    // ── Info Panel ────────────────────────────────────────────────────────────
    function updateInfoPanel(meshes) {
        infoMeshes.textContent = meshes.length;
        infoAnims.textContent  = scene.animationGroups.length;
        const bounds = getBounds(meshes);
        if (bounds) {
            const size   = bounds.max.subtract(bounds.min);
            const maxDim = Math.max(size.x, size.y, size.z).toFixed(2);
            infoSize.textContent = `${maxDim} units`;
        } else {
            infoSize.textContent = "—";
        }
    }

    // ── Animation Panel ───────────────────────────────────────────────────────
    function buildAnimPanel() {
        const groups = scene.animationGroups;
        if (!groups.length) { animControls.classList.add("hidden"); return; }

        animList.innerHTML = "";
        animControls.classList.remove("hidden");

        groups.forEach((g, i) => {
            const btn = document.createElement("button");
            btn.className   = "anim-btn";
            btn.textContent = g.name || `Animation ${i + 1}`;
            btn.title       = g.name;

            btn.addEventListener("click", () => {
                if (activeAnimGroup === g && g.isPlaying) {
                    g.pause();
                    btn.classList.remove("active");
                    activeAnimGroup = null;
                } else {
                    groups.forEach(ag => ag.stop());
                    document.querySelectorAll(".anim-btn").forEach(b => b.classList.remove("active"));
                    g.play(true);
                    btn.classList.add("active");
                    activeAnimGroup = g;
                }
            });

            animList.appendChild(btn);
        });
    }

    // ── Clear Model ───────────────────────────────────────────────────────────
    function clearModel() {
        scene.animationGroups.forEach(g => g.stop());
        activeAnimGroup = null;
        animControls.classList.add("hidden");

        currentMeshes.forEach(m => m.dispose());
        currentMeshes = [];

        // Revoke any object URLs we registered previously
        registeredUrls.forEach(url => URL.revokeObjectURL(url));
        registeredUrls = [];

        // Clear Babylon's in-memory file store
        BABYLON.FilesInputStore.FilesToLoad = {};

        infoMeshes.textContent = "—";
        infoAnims.textContent  = "—";
        infoSize.textContent   = "—";
    }

    // ── On Model Loaded ───────────────────────────────────────────────────────
    function onModelLoaded(meshes, label) {
        currentMeshes = meshes;
        frameCamera(meshes);
        updateInfoPanel(meshes);
        buildAnimPanel();
        setStatus(`Loaded: ${label} — ${meshes.length} mesh(es)`, "ready");
    }

    // ── Register supporting files into Babylon's in-memory store ─────────────
    //
    // Babylon's GLTF loader resolves relative URIs (e.g. "scene.bin",
    // "textures/albedo.jpg") by checking BABYLON.FilesInputStore.FilesToLoad
    // keyed by the *lowercase* bare filename before making a network request.
    //
    // We register every supporting file (bin, images, etc.) there so the
    // loader can find them without needing a real server.
    //
    function registerSupportingFiles(files) {
        for (const file of files) {
            // Use the bare filename (no directory path) as the key.
            // The GLTF spec says URIs are relative to the .gltf location,
            // and Babylon normalises them to just the filename when resolving
            // from FilesInputStore.
            const key = file.name.toLowerCase();
            BABYLON.FilesInputStore.FilesToLoad[key] = file;
        }
    }

    // ── Load a collection of files (multi-file GLTF or single GLB) ───────────
    function loadFiles(fileList) {
        const files = Array.from(fileList);
        if (!files.length) return;

        // Find the entry point (.gltf or .glb)
        const entryFile = files.find(f =>
            f.name.toLowerCase().endsWith(".gltf") ||
            f.name.toLowerCase().endsWith(".glb")
        );

        if (!entryFile) {
            setStatus("No .gltf or .glb file found in selection.", "error");
            return;
        }

        clearModel();
        setStatus(`Loading ${entryFile.name}…`, "loading");

        const isGlb = entryFile.name.toLowerCase().endsWith(".glb");

        if (isGlb) {
            // GLB is self-contained — load directly via object URL
            const url = URL.createObjectURL(entryFile);
            registeredUrls.push(url);

            BABYLON.SceneLoader.ImportMeshAsync("", url, "", scene, null, ".glb")
                .then(({ meshes }) => onModelLoaded(meshes, entryFile.name))
                .catch(err => setStatus(`Error: ${err.message}`, "error"));

        } else {
            // GLTF — register ALL supporting files first, then load the entry
            const supportingFiles = files.filter(f => f !== entryFile);
            registerSupportingFiles(supportingFiles);

            // Create an object URL only for the .gltf entry file itself.
            // Babylon will use FilesInputStore for everything it references.
            const entryUrl = URL.createObjectURL(entryFile);
            registeredUrls.push(entryUrl);

            // We pass the object URL as the full path and "" as the filename
            // so Babylon uses it directly as the root URL.
            BABYLON.SceneLoader.ImportMeshAsync("", entryUrl, "", scene, null, ".gltf")
                .then(({ meshes }) => onModelLoaded(meshes, entryFile.name))
                .catch(err => {
                    // Fallback: try loading with the filename split out,
                    // which sometimes helps Babylon resolve relative paths better.
                    const rootUrl  = entryUrl.substring(0, entryUrl.lastIndexOf("/") + 1);
                    const fileName = entryFile.name;
                    return BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, fileName, scene)
                        .then(({ meshes }) => onModelLoaded(meshes, entryFile.name))
                        .catch(err2 => setStatus(`Error: ${err2.message}`, "error"));
                });
        }
    }

    // ── Load Sample (BoomBox GLB) ─────────────────────────────────────────────
    function loadSample() {
        clearModel();
        setStatus("Loading sample model…", "loading");
        BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "https://raw.githubusercontent.com/BabylonJS/Assets/master/meshes/",
            "BoomBox.glb",
            scene
        )
            .then(({ meshes }) => onModelLoaded(meshes, "BoomBox.glb"))
            .catch(err => setStatus(`Error: ${err.message}`, "error"));
    }

    // ── Reset Camera ──────────────────────────────────────────────────────────
    function resetCamera() {
        if (currentMeshes.length) {
            frameCamera(currentMeshes);
        } else {
            camera.alpha  = defaultCamState.alpha;
            camera.beta   = defaultCamState.beta;
            camera.radius = defaultCamState.radius;
            camera.target = BABYLON.Vector3.Zero();
        }
    }

    // ── Event Listeners ───────────────────────────────────────────────────────

    fileInput.addEventListener("change", (e) => {
        loadFiles(e.target.files);
        fileInput.value = "";
    });

    sampleBtn.addEventListener("click", loadSample);
    resetBtn.addEventListener("click", resetCamera);

    // Drag & Drop — handle both files and folder entries
    let dragCounter = 0;

    window.addEventListener("dragenter", (e) => {
        e.preventDefault();
        dragCounter++;
        dropOverlay.classList.add("active");
    });

    window.addEventListener("dragleave", () => {
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            dropOverlay.classList.remove("active");
        }
    });

    window.addEventListener("dragover", (e) => e.preventDefault());

    window.addEventListener("drop", async (e) => {
        e.preventDefault();
        dragCounter = 0;
        dropOverlay.classList.remove("active");

        // Use DataTransferItemList API to support folder drops (Chrome/Edge)
        const allFiles = await collectDroppedFiles(e.dataTransfer);
        if (allFiles.length) loadFiles(allFiles);
    });

    // ── Folder Drop Helper ────────────────────────────────────────────────────
    // Recursively reads a DataTransferItem directory entry and returns all files.
    async function collectDroppedFiles(dataTransfer) {
        const files = [];

        // Modern API: DataTransferItemList with FileSystemEntry support
        if (dataTransfer.items && dataTransfer.items.length) {
            const entries = Array.from(dataTransfer.items)
                .map(item => item.webkitGetAsEntry && item.webkitGetAsEntry())
                .filter(Boolean);

            for (const entry of entries) {
                const gathered = await readEntry(entry);
                files.push(...gathered);
            }
            return files;
        }

        // Fallback: flat file list (no folder support)
        return Array.from(dataTransfer.files);
    }

    function readEntry(entry) {
        return new Promise((resolve) => {
            if (entry.isFile) {
                entry.file(
                    file => resolve([file]),
                    ()   => resolve([])
                );
            } else if (entry.isDirectory) {
                const reader = entry.createReader();
                const results = [];

                // createReader only returns up to 100 entries per call;
                // keep calling until it returns an empty batch.
                const readAll = () => {
                    reader.readEntries(async (entries) => {
                        if (!entries.length) {
                            resolve(results);
                        } else {
                            for (const e of entries) {
                                const sub = await readEntry(e);
                                results.push(...sub);
                            }
                            readAll();
                        }
                    }, () => resolve(results));
                };

                readAll();
            } else {
                resolve([]);
            }
        });
    }

    // ── Render Loop ───────────────────────────────────────────────────────────
    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
})();
