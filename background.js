const DEFAULT_STATE = {
  health: 100,
  hungriness: 0,
  isBoredom: false,
  isAlive: true,
  lastTimeStamp: Date.now(),
  availableFood: 0,
  clickCount: 0,
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
    (gameState.hungriness || 0) + HUNGER_RATE * timeDiff
  );
  const wasAlive = gameState.isAlive;
  gameState.isAlive = isAliveState(gameState);
  gameState.lastTimeStamp = now;
  await browser.storage.local.set({ gameState });
  if (wasAlive && !gameState.isAlive) {
    notify_popup("dead");
  }
}

function isAliveState(gameState) {
  return gameState && gameState.hungriness < 100;
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
    default:
      return;
  }
});
