const foodEl = document.getElementById("available-food-count");
const hungryEl = document.getElementById("hungriness-level-count");
const progressEl = document.getElementById("hungriness-bar");
const playButton = document.getElementById("play-game");
const feedButton = document.getElementById("feed-button");
const octoPetImg = document.getElementById("octo-pet");
const defaultSrc = "/assets/octo_icon.png";
const hungrySrc = "/assets/hungry_octopus.png";

function paintGameState({
  availableFood = 0,
  hungriness = 0,
  isHungry = false,
}) {
  foodEl.textContent = availableFood;
  hungryEl.textContent = parseInt(hungriness);
  progressEl.style.width = `${parseInt(hungriness)}%`;
  if (isHungry) {
    octoPetImg.src = hungrySrc;
  } else {
    octoPetImg.src = defaultSrc;
  }
}

async function update_state() {
  try {
    const { gameState } = await browser.storage.local.get({ gameState: {} });
    const isHungry = gameState.hungriness > 60;
    paintGameState({ ...gameState, isHungry });
  } catch (error) {
    console.error("Error updating game state values", error);
  }
}

update_state();

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.gameState) {
    const newState = changes.gameState.newValue;
    const isHungry = newState.hungriness > 60;
    paintGameState({ ...newState, isHungry });
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

playButton.addEventListener("click", async () => {
  await browser.runtime.sendMessage({ type: "play-clicked" });
});

feedButton.addEventListener("click", async () => {
  let result = await browser.runtime.sendMessage({ type: "feed", amount: 5 });
});
