(() => {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "platform.css?v=15";
  document.head.appendChild(stylesheet);

  const legacy = document.createElement("script");
  legacy.src = "v14.js?v=15";
  legacy.async = false;
  legacy.onload = () => {
    const platform = document.createElement("script");
    platform.src = "platform.js?v=15";
    platform.async = false;
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
