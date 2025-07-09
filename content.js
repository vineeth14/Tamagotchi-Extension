document.addEventListener("click", () => {
  browser.runtime
    .sendMessage({
      type: "click-increment",
    })
    .then((response) => {
      console.log("background response", response);
    })
    .catch((err) => {
      console.error("Error sending number of clicks", err);
    });
});
