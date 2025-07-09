const foodEl = document.getElementById("available-food-count");
const hungryEl = document.getElementById("hungriness-level-count");

function paintGameState({ availableFood = 0, hungriness = 0 }) {
  foodEl.textContent = availableFood;
  hungryEl.textContent = hungriness;
}

async function update_state() {
  try {
    const { gameState } = await browser.storage.local.get({ gameState: {} });
    paintGameState(gameState);
  } catch (error) {
    console.error("Error updating game state values", error);
  }
}

update_state();

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.gameState) {
    paintGameState(changes.gameState.newValue);
  }
});

const port = browser.runtime.connect({ name: "popup-channel" });

port.postMessage({ type: "get-state" });
port.onMessage.addListener((msg) => {
  if (msg.type === "state") {
    console.log("tamagotchi port channel connected");
  } else if (msg.type === "dead-pet") {
    alert("Tamagotchi Died :( \n Restart Game by clicking play! 🐙");
  }
});

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

document.querySelector("#test-state").addEventListener("click", async () => {
  const state = await browser.runtime.sendMessage({ type: "gameState" });
  console.log("Current gameState:", state);
  // document.querySelector("#state-output").textContent = JSON.stringify(state);
});
