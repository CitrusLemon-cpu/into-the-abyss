// File URLs cannot fetch local WASM or .riv assets. Load their embedded bytes
// only for double-click previews; HTTP sites continue using the binary files.
const manateeSourceReady = location.protocol === "file:"
  ? new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "ocean-assets/rive/file-preview.js";
      script.onload = () => resolve({ buffer: window.manateeRiveBuffer });
      script.onerror = () => reject(new Error("Unable to load Rive file preview assets"));
      document.head.append(script);
    })
  : Promise.resolve({ src: "ocean-assets/rive/manatee_animation.riv" });

// The wrapper keeps the old 800 × 550 footprint; tail space extends right.
window.createManateeRive = (className) => {
  const wrapper = document.createElement("span");
  wrapper.className = `${className} manatee-rive`;
  const canvas = document.createElement("canvas");
  canvas.width = 850;
  canvas.height = 550;
  canvas.setAttribute("aria-hidden", "true");
  wrapper.append(canvas);
  let player;
  let loaded = false;
  let visible = false;
  let playing = false;
  let loading = false;
  let disposed = false;
  const sync = () => {
    if (!loaded) return;
    const next = visible && !document.hidden;
    if (next === playing) return;
    playing = next;
    if (next) player.play("Bobbing");
    else player.pause();
  };
  const observer = new IntersectionObserver(async ([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !player && !loading) {
      loading = true;
      let source;
      try {
        source = await manateeSourceReady;
      } catch (error) {
        console.error(error);
        return;
      }
      if (disposed) return;
      player = new rive.Rive({
        ...source,
        canvas,
        artboard: "manatee",
        animations: "Bobbing",
        autoplay: false,
        layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.Center }),
        onLoad: () => {
          loaded = true;
          player.resizeDrawingSurfaceToCanvas(Math.min(window.devicePixelRatio || 1, 1.5));
          sync();
        },
        onLoadError: (event) => console.error("Unable to load manatee animation", event),
      });
    }
    sync();
  });
  observer.observe(canvas);
  const resize = new ResizeObserver(() => {
    if (loaded) player.resizeDrawingSurfaceToCanvas(Math.min(window.devicePixelRatio || 1, 1.5));
  });
  resize.observe(canvas);
  document.addEventListener("visibilitychange", sync);
  wrapper.cleanupRive = () => {
    disposed = true;
    observer.disconnect();
    resize.disconnect();
    document.removeEventListener("visibilitychange", sync);
    player?.cleanup();
  };
  return wrapper;
};
