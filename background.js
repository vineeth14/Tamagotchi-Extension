browser.runtime.onInstalled.addListener(
  async (request, sender, sendResponse) => {
    try {
      const result = await browser.storage.local.get(["clickCount"]);
      const count = result.clickCount || 0;
      browser.browserAction.setBadgeText({
        text: String(count),
      });
    } catch (error) {
      console.error("Error initializing badge on install: ", error);
    }
  }
);

async function update_badge() {
  const { clickCount = 0 } = await browser.storage.local.get({ clickCount: 0 });
  browser.browserAction.setBadgeText({
    text: String(clickCount),
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
  if (popupPort && data == "dead") {
    popupPort.postMessage({ type: "dead-pet" });
  }
}

const HUNGER_RATE = 0.0001;
browser.runtime.onStartup.addListener(init);
browser.runtime.onInstalled.addListener(init);
browser.alarms.onAlarm.addListener(onAlarm);

init();

async function init() {
  let { gameState } = await browser.storage.local.get({ gameState: null });
  if (!gameState) {
    gameState = {
      health: 100,
      hungriness: 0,
      isBoredom: false,
      isAlive: true,
      lastTimeStamp: Date.now(),
    };
    await browser.storage.local.set({ gameState });
  }
  update_badge();
  browser.alarms.create("gameTick", { periodInMinutes: 1 });
}

async function onAlarm(alarm) {
  console.log("Alarm fired");
  console.log("Alarm", await browser.storage.local.get({ gameState: {} }));
  if (alarm.name !== "gameTick") return;
  let { gameState } = await browser.storage.local.get({ gameState: {} });
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
    gameState = {
      health: 100,
      hungriness: 0,
      isBoredom: false,
      isAlive: true,
      lastTimeStamp: Date.now(),
    };
  }
  const now = Date.now();
  const timeDiff = now - (gameState.lastTimeStamp || now);
  gameState.hungriness = Math.min(
    100,
    (gameState.hungriness || 0) + HUNGER_RATE * timeDiff
  );
  gameState.lastTimeStamp = now;
  await browser.storage.local.set({ gameState });
  switch (msg.type) {
    case "click-increment":
      const { clickCount = 0 } = await browser.storage.local.get({
        clickCount: 0,
      });
      const newCount = clickCount + 1;
      await browser.storage.local.set({ clickCount: newCount });
      update_badge();
      return { count: newCount };
    case "gameState":
      return gameState;
    case "feed":
      gameState.hungriness = Math.max(0, gameState.hungriness - msg.amount);
      gameState.isAlive = isAliveState(gameState);
      await browser.storage.local.set({ gameState });
      return { success: true, gameState };
    case "play-clicked":
      gameState = {
        health: 100,
        hungriness: 0,
        isBoredom: false,
        isAlive: true,
        lastTimeStamp: Date.now(),
      };
      await browser.storage.local.set({ gameState });
      break;
    default:
      return;
  }
});
