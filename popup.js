const priceRegex = /\$\s?([\d,]+(?:\.\d{2})?)/g;
// Function to render the shopping list
function renderList() {
  const listContainer = document.getElementById('shoppingList');
  // Clear the current list completely
  while (listContainer.firstChild) {
    listContainer.removeChild(listContainer.firstChild);
  }

  // Get items from chrome.storage.sync
  chrome.storage.sync.get(['tariffItems'], function(result) {
    const items = result.tariffItems || [];
    
    if (items.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = 'No items in your list';
      emptyMessage.style.textAlign = 'center';
      emptyMessage.style.padding = '20px';
      listContainer.appendChild(emptyMessage);
      return;
    }

    // Create table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginBottom = '20px';

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#f5f5f5';
    headerRow.style.borderBottom = '2px solid #ddd';

    const headers = ['Item Name', 'Base Price', 'Tariff Price', 'Country', ''];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      th.style.padding = '12px';
      th.style.textAlign = 'left';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    let totalBasePrice = 0;
    let totalTariffPrice = 0;

    items.forEach(item => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #ddd';

      // Item Name
      const nameCell = document.createElement('td');
      const nameLink = document.createElement('a');
      nameLink.href = item.url;
      nameLink.textContent = item.itemName;
      nameLink.target = '_blank';
      nameLink.style.color = '#0066cc';
      nameLink.style.textDecoration = 'none';
      nameCell.appendChild(nameLink);
      nameCell.style.padding = '12px';
      row.appendChild(nameCell);

      // Base Price
      const basePriceCell = document.createElement('td');
      basePriceCell.textContent = item.basePrice;
      basePriceCell.style.padding = '12px';
      row.appendChild(basePriceCell);
      totalBasePrice += parseFloat(item.basePrice.replace(/[^0-9.-]+/g, ''));

      // Tariff Price (currently same as base price)
      const tariffPriceCell = document.createElement('td');
      const tariffPrice = getTariffPrice(item.basePrice, item.country, item.productType, item.pricingModel);
      tariffPriceCell.textContent = tariffPrice;
      tariffPriceCell.style.padding = '12px';
      row.appendChild(tariffPriceCell);
      totalTariffPrice += parseFloat(tariffPrice.replace(/[^0-9.-]+/g, ''));

      // Country
      const countryCell = document.createElement('td');
      countryCell.textContent = item.country;
      countryCell.style.padding = '12px';
      row.appendChild(countryCell);

      // Remove button
      const buttonCell = document.createElement('td');
      buttonCell.style.padding = '12px';
      const removeButton = document.createElement('button');
      const binIcon = document.createElement('img');
      binIcon.src = 'bin.png';
      binIcon.style.width = '20px';
      binIcon.style.height = '20px';
      removeButton.appendChild(binIcon);
      removeButton.style.backgroundColor = 'transparent';
      removeButton.style.border = 'none';
      removeButton.style.cursor = 'pointer';
      
      removeButton.addEventListener('click', () => {
        chrome.storage.sync.get(['tariffItems'], function(result) {
          const currentItems = result.tariffItems || [];
          const updatedItems = currentItems.filter(i => i.id !== item.id);
          chrome.storage.sync.set({ tariffItems: updatedItems }, function() {
            renderList();
          });
        });
      });

      buttonCell.appendChild(removeButton);
      row.appendChild(buttonCell);
      tbody.appendChild(row);
    });

    // Add summary row
    const summaryRow = document.createElement('tr');
    summaryRow.style.backgroundColor = '#f5f5f5';
    summaryRow.style.fontWeight = 'bold';
    summaryRow.style.borderTop = '2px solid #ddd';

    const totalLabelCell = document.createElement('td');
    totalLabelCell.textContent = 'Total';
    totalLabelCell.style.padding = '12px';
    summaryRow.appendChild(totalLabelCell);

    const totalBasePriceCell = document.createElement('td');
    totalBasePriceCell.textContent = `$${totalBasePrice.toFixed(2)}`;
    totalBasePriceCell.style.padding = '12px';
    summaryRow.appendChild(totalBasePriceCell);

    const totalTariffPriceCell = document.createElement('td');
    totalTariffPriceCell.textContent = `$${totalTariffPrice.toFixed(2)}`;
    totalTariffPriceCell.style.padding = '12px';
    summaryRow.appendChild(totalTariffPriceCell);

    const emptyCell = document.createElement('td');
    emptyCell.style.padding = '12px';
    summaryRow.appendChild(emptyCell);

    tbody.appendChild(summaryRow);
    table.appendChild(tbody);
    listContainer.appendChild(table);
  });
}

// Listen for storage changes to update the list
// chrome.storage.onChanged.addListener(function(changes, namespace) {
//   if (namespace === 'sync' && changes.tariffItems) {
//     renderList();
//   }
// });

// Add event listener for the refresh button
document.getElementById('refreshPrices').addEventListener('click', () => {
    // Get the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        // Send message to content script to trigger price replacement
        chrome.tabs.sendMessage(tabs[0].id, {action: "replacePrices"});
    });
});

// Initial render
renderList();

function getTariffPrice(basePrice, country, productType, pricingModel) {
  // Extract the numeric price value
  const priceMatch = basePrice.match(priceRegex);
  const isPercentagePricing = pricingModel === "true";
  if (!priceMatch) return basePrice;
  
  const originalPrice = parseFloat(basePrice.replace(/[^0-9.-]+/g, ''));
  
  // Get tariff rates from maps
  const tariffPercentage = countryMap[country] || countryMap["Default"];
  const markupPercentage = categoryMap[productType] || categoryMap["General"];
  
  let adjustedPrice;
  if (isPercentagePricing) {
    adjustedPrice = originalPrice * (1 + tariffPercentage / 100);
  } else {
    const importPrice = originalPrice / (1 + markupPercentage / 100);
    const tariffTaxes = importPrice * tariffPercentage / 100;
    adjustedPrice = originalPrice + tariffTaxes;
  }
  
  return `$${adjustedPrice.toFixed(2)}`;
}

