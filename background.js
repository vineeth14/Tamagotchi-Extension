browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'click-count') {
    browser.browserAction.setBadgeText({
      text: String(message.count)
    })
    console.log(message)
    return Promise.resolve('Count updated')
  }
})
