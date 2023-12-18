chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureTab") {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
            sendResponse({dataUrl: dataUrl});
        });
        return true; // Indicates that the response is asynchronous
    }
});