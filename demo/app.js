(() => {
  const styles = ["platform.css?v=17", "optimization.css?v=17", "continuity.css?v=17"];
  styles.forEach(href => {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = href;
    document.head.appendChild(stylesheet);
  });

  const loadScript = (src, onload) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = onload;
    document.body.appendChild(script);
  };

  loadScript("v14.js?v=17", () => {
    loadScript("platform.js?v=17", () => {
      loadScript("optimization.js?v=17", () => {
        loadScript("continuity.js?v=17");
      });
    });
  });
})();
