(() => {
  const styles = ["platform.css?v=18", "optimization.css?v=18", "continuity.css?v=18"];
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

  loadScript("v14.js?v=18", () => {
    loadScript("platform.js?v=18", () => {
      loadScript("optimization.js?v=18", () => {
        loadScript("continuity.js?v=18");
      });
    });
  });
})();
