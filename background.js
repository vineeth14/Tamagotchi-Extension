const DEFAULT_STATE = {
  // health: 100,
  hungriness: 0,
  happiness: 50,
  isBoredom: false,
  isAlive: true,
  lastTimeStamp: Date.now(),
  availableFood: 0,
  clickCount: 0,
  currentSite: null,
  siteStartTime: null,
  totalTimeSpent: {},
};

const siteCategories = {
  educational: {
    sites: ["wikipedia.org", "coursera.org", "github.com"],
    happiness: 3,
  },
  productivity: {
    sites: ["gmail.com", "docs.google.com", "notion.so", "recurse.com"],
    happiness: 3,
  },
  social: {
    sites: [
      "google.com",
      "facebook.com",
      "twitter.com",
      "instagram.com",
      "tiktok.com",
    ],
    happiness: -2,
  },
  entertainment: {
    sites: ["youtube.com", "netflix.com", "twitch.tv"],
    happiness: -2,
  },
};

browser.runtime.onInstalled.addListener(async () => {
  try {
    const { gameState } = await browser.storage.local.get({
      gameState: DEFAULT_STATE,
    });
    const count = gameState.clickCount || 0;
    browser.browserAction.setBadgeText({
      text: String(count),
    });
  } catch (error) {
    console.error("Error initializing badge on install: ", error);
  }
});

async function update_badge() {
  const { gameState } = await browser.storage.local.get({
    gameState: DEFAULT_STATE,
  });
  browser.browserAction.setBadgeText({
    text: String(gameState.clickCount),
  });
}

let popupPort = null;
browser.runtime.onConnect.addListener((port) => {
  if (port.name === "popup-channel") {
    popupPort = port;
    port.onDisconnect.addListener(() => {
      popupPort = null;
    });
  }
});

function notify_popup(data) {
  console.log("Your Pet has died");
  browser.notifications
    .create({
      type: "basic",
      title: "Tamagotchi",
      message: "Your octo-pet died",
    })
    .catch((err) => console.error("notifications.create failed:", err));
}

const HUNGER_RATE = 0.0001;
browser.runtime.onStartup.addListener(init);
browser.runtime.onInstalled.addListener(init);
browser.alarms.onAlarm.addListener(onAlarm);

init();

async function init() {
  let { gameState } = await browser.storage.local.get({ gameState: null });
  if (!gameState) {
    gameState = DEFAULT_STATE;
    await browser.storage.local.set({ gameState });
  }
  update_badge();
  browser.alarms.create("gameTick", { periodInMinutes: 1 });
}

async function onAlarm(alarm) {
  console.log("Alarm fired");
  console.log("Alarm", await browser.storage.local.get({ gameState: {} }));
  if (alarm.name !== "gameTick") return;
  let { gameState } = await browser.storage.local.get({
    gameState: DEFAULT_STATE,
  });
  const now = Date.now();
  const timeDiff = now - (gameState.lastTimeStamp || now);
  gameState.hungriness = Math.min(
    100,
    (gameState.hungriness || 0) + HUNGER_RATE * timeDiff,
  );
  const wasAlive = gameState.isAlive;
  gameState.isAlive = isAliveState(gameState);
  gameState.lastTimeStamp = now;
  if (wasAlive && !gameState.isAlive) {
    notify_popup("dead");
  }

  if (gameState.currentSite && gameState.siteStartTime) {
    const timeOnCurrentSite = Date.now() - gameState.siteStartTime;
    gameState = updateHappinessForTimeSpent(
      gameState,
      gameState.currentSite,
      timeOnCurrentSite,
    );
    gameState.siteStartTime = Date.now();
  }
  await browser.storage.local.set({ gameState });
}

function isAliveState(gameState) {
  return gameState && gameState.hungriness < 100;
}

function getCategoryForUrl(url) {
  if (!url) return null;
  for (const [category, config] of Object.entries(siteCategories)) {
    if (config.sites.some((site) => url.includes(site))) {
      return category;
    }
  }
  return null;
}

function updateHappinessForTimeSpent(gameState, url, timeMs) {
  const category = getCategoryForUrl(url);
  if (!category) return gameState;
  const minutes = timeMs / (1000 * 60);
  const happinessRates = {
    educational: 1,
    productivity: 0.8,
    social: -0.5,
    entertainment: -0.5,
  };
  const change = (happinessRates[category] || 0) * minutes;
  return {
    ...gameState,
    happiness: Math.max(0, Math.min(100, gameState.happiness + change)),
  };
}

function handleSiteExit(gameState) {
  if (!gameState.currentSite || !gameState.siteStartTime) {
    return gameState;
  }
  const timeSpent = Date.now() - gameState.siteStartTime;
  const updatedState = updateHappinessForTimeSpent(
    gameState,
    gameState.currentSite,
    timeSpent,
  );
  const category = getCategoryForUrl(gameState.currentSite);
  if (category) {
    updatedState.totalTimeSpent[category] =
      (updatedState.totalTimeSpent[category] || 0) + timeSpent;
  }
  return updatedState;
}

browser.runtime.onMessage.addListener(async (msg) => {
  let { gameState } = await browser.storage.local.get({ gameState: null });
  if (!gameState) {
    gameState = DEFAULT_STATE;
  }
  await browser.storage.local.set({ gameState });
  switch (msg.type) {
    case "click-increment":
      gameState.clickCount = gameState.clickCount + 1;
      if (gameState.clickCount % 5 == 0) {
        gameState.availableFood = gameState.clickCount / 5;
      }
      await browser.storage.local.set({ gameState });
      update_badge();
      return { count: gameState.clickCount };
    case "gameState":
      return gameState;
    case "feed":
      if (gameState.availableFood > 0) {
        gameState.hungriness = Math.max(0, gameState.hungriness - msg.amount);
        gameState.availableFood -= 1;
        gameState.clickCount -= 5;
        gameState.isAlive = isAliveState(gameState);
        await browser.storage.local.set({ gameState });
        return { success: true, gameState };
      } else {
        return { success: false, gameState };
      }
    case "play-clicked":
      gameState = DEFAULT_STATE;
      await browser.storage.local.set({ gameState });
      break;
    case "site-enter":
      if (gameState.currentSite && gameState.siteStartTime) {
        gameState = handleSiteExit(gameState);
      }
      gameState.currentSite = msg.url;
      gameState.siteStartTime = Date.now();
      await browser.storage.local.set({ gameState });
      break;
    case "site-exit":
      gameState = handleSiteExit(gameState);
      gameState.currentSite = null;
      gameState.siteStartTime = null;
      await browser.storage.local.set({ gameState });
      break;
    default:
      return;
  }
});
