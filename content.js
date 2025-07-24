let currentUrl = window.location.hostname;
let lastUrl = currentUrl;
document.addEventListener("click", () => {
  browser.runtime
    .sendMessage({
      type: "click-increment",
      url: currentUrl,
    })
    .then((response) => {
      console.log("background response", response);
    })
    .catch((err) => {
      console.error("Error sending number of clicks", err);
    });
});

browser.runtime.sendMessage({ type: "site-enter", url: currentUrl });

setInterval(() => {
  const newUrl = window.location.hostname;
  if (newUrl != lastUrl) {
    browser.runtime.sendMessage({ type: "site-exit", url: lastUrl });
    browser.runtime.sendMessage({ type: "site-enter", url: newUrl });
    lastUrl = newUrl;
  }
}, 1000);
