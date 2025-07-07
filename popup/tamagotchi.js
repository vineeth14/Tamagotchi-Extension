async function getClickCount() {
  try {
    const countObj = await browser.storage.local.get(["clickCount"]);
    const count = countObj.clickCount || 0;
    document.getElementById("counter-display").textContent = count;
  } catch (error) {
    console.error("Error getting click count:", error);
  }
}

getClickCount();

// const port = browser.runtime.connect({ name: "popup-channel" });

// port.postMessage({ type: "get-state" });
// port.onMessage.addListener((msg) => {
//   if (msg.type === "state") {
//     console.log("tamagotchi port channel connected");
//   }
// });

const playButton = document.getElementById("play-game");
const feedButton = document.getElementById("feed-button");
const octoPetImg = document.getElementById("octo-pet");
const defautlSrc = "/assets/octo_icon.png";
const newSrc = "/assets/hungo_octopus.png";

playButton.addEventListener("click", async () => {
  await browser.runtime.sendMessage({ type: "play-clicked" });
});

feedButton.addEventListener("click", async () => {
  await browser.runtime.sendMessage({ type: "feed", amount: 5 });
});

async function refreshUI() {
  const state = await browser.runtime.sendMessage({ type: "gameState" });
  console.log("state", state);
}

window.onload = refreshUI;

document.querySelector("#test-state").addEventListener("click", async () => {
  const state = await browser.runtime.sendMessage({ type: "gameState" });
  console.log("Current gameState:", state);
  // document.querySelector("#state-output").textContent = JSON.stringify(state);
});
