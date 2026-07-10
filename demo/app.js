(() => {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "platform.css?v=16";
  document.head.appendChild(stylesheet);

  const optimizationStyles = document.createElement("link");
  optimizationStyles.rel = "stylesheet";
  optimizationStyles.href = "optimization.css?v=16";
  document.head.appendChild(optimizationStyles);

  const legacy = document.createElement("script");
  legacy.src = "v14.js?v=16";
  legacy.async = false;
  legacy.onload = () => {
    const platform = document.createElement("script");
    platform.src = "platform.js?v=16";
    platform.async = false;
    platform.onload = () => {
      const optimization = document.createElement("script");
      optimization.src = "optimization.js?v=16";
      optimization.async = false;
      document.body.appendChild(optimization);
    };
    document.body.appendChild(platform);
  };
  legacy.onerror = () => {
    const notice = document.createElement("p");
    notice.className = "platform-load-error";
    notice.textContent = "Tether could not load the recovered interaction engine.";
    document.body.appendChild(notice);
  };
  document.body.appendChild(legacy);
})();
