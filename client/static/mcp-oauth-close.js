window.close();
setTimeout(() => {
  const el = document.getElementById("status");
  if (el) el.textContent = "You can close this window now.";
}, 300);
