chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "replacePricesWithButtons") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "replacePricesWithButtons" });
      }
    });
  }
}); 