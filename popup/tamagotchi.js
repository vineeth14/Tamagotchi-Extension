const foodEl = document.getElementById("available-food-count");
const hungryEl = document.getElementById("hungriness-level-count");
const progressEl = document.getElementById("hungriness-bar");
const playButton = document.getElementById("play-game");
const feedButton = document.getElementById("feed-button");
const octoPetImg = document.getElementById("octo-pet");
const defaultSrc = "/assets/octo_icon.png";
const hungrySrc = "/assets/hungry_octopus.png";
const happinessEl = document.getElementById("happiness-level-count");
const happinessProgressEl = document.getElementById("happiness-bar");
const sadSrc = "/assets/hungry_octopus.png";
const moodStatusEl = document.getElementById("mood-status");
const siteStatusEl = document.getElementById("site-status");
const happinessLabelEl = document.getElementById("happiness-label");
const hungerLabelEl = document.getElementById("hunger-label");

function getMoodText(happiness, hungriness, isAlive) {
  if (!isAlive) return "octo is not feeling well";
  if (hungriness > 80) return "octo is dying";
  if (happiness < 20) return "octo is not okay";
  if (happiness < 40) return "octo is mid rn";
  if (happiness > 80) return "octo is feeling blessed";
  if (happiness > 60) return "octo is pretty happy";
  return "octo is vibing";
}

function getSiteStatusText(currentSite) {
  if (!currentSite) return "website not registered";

  const siteCategories = {
    educational: {
      sites: ["wikipedia.org", "coursera.org", "github.com"],
      effect: "Happy",
    },
    productivity: {
      sites: ["gmail.com", "docs.google.com", "notion.so", "recurse.com"],
      effect: "Happy",
    },
    social: {
      sites: [
        "google.com",
        "facebook.com",
        "twitter.com",
        "instagram.com",
        "tiktok.com",
      ],
      effect: "Sad",
    },
    entertainment: {
      sites: ["youtube.com", "netflix.com", "twitch.tv"],
      effect: "Sad",
    },
  };

  for (const [category, config] of Object.entries(siteCategories)) {
    if (config.sites.some((site) => currentSite.includes(site))) {
      return `${currentSite} (${category})`;
    }
  }
  return `${currentSite} (neutral)`;
}

function paintGameState({
  availableFood = 0,
  hungriness = 0,
  happiness = 50,
  isHungry = false,
  isAlive = true,
  currentSite = null,
}) {
  foodEl.textContent = availableFood;
  hungryEl.textContent = parseInt(hungriness);
  progressEl.style.width = `${parseInt(hungriness)}%`;

  // Add happiness display
  happinessEl.textContent = parseInt(happiness);
  happinessProgressEl.style.width = `${parseInt(happiness)}%`;

  // Update progress labels with percentages
  happinessLabelEl.textContent = `Happiness ${parseInt(happiness)}%`;
  hungerLabelEl.textContent = `Hunger ${parseInt(hungriness)}%`;

  // Update mood and site status
  moodStatusEl.textContent = getMoodText(happiness, hungriness, isAlive);
  siteStatusEl.textContent = getSiteStatusText(currentSite);

  // Add critical state visual feedback
  happinessProgressEl.classList.toggle("critical", happiness < 20);
  progressEl.classList.toggle("critical", hungriness > 80);

  if (isHungry) {
    octoPetImg.src = hungrySrc;
  } else if (happiness < 60) {
    octoPetImg.src = sadSrc;
  } else {
    octoPetImg.src = defaultSrc;
  }
}

async function update_state() {
  try {
    const { gameState } = await browser.storage.local.get({ gameState: {} });
    const isHungry = gameState.hungriness > 60;
    const isSad = gameState.happiness < 60;
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
