let clickCount = 0

console.log('Content script loaded')

document.addEventListener('click', () => {
  clickCount++
  browser.runtime
    .sendMessage({
      type: 'click-count',
      count: clickCount
    })
    .then(response => {
      console.log('background response', response)
    })
    .catch(err => {
      console.error('Error sending number of clicks', err)
    })
})
