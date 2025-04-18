const priceRegex = /\$\s?([\d,]+(?:\.\d{2})?)/g;

// Function to replace price text with buttons
function replacePricesWithButtons() {
    // Get all text nodes in the page
    const walk = (node) => {
        if (node.nodeType === 3) { // Text node  
            let priceText = node.textContent;
    
            // Replace price text with a button (matching the regex pattern)
            const newText = priceText.replace(priceRegex, (match, p1) => {
                // Skip if this exact price text is already a button
                if (node.parentElement && node.parentElement.classList.contains('price-button')) {
                    return match;
                }
                
                const price = parseFloat(p1.replace(/,/g, ''));  // Clean up the price
                
                // Create the button
                const button = document.createElement('button');
                button.className = 'price-button';
                button.textContent = match;
                
                // Create the icon image
                const icon = document.createElement('img');
                icon.src = chrome.runtime.getURL('tariff-shopping-list.png');
                icon.style.width = '30px';
                icon.style.height = '30px';
                icon.style.marginLeft = '5px';
                icon.style.verticalAlign = 'middle';
                
                // Add the icon to the button
                button.appendChild(icon);
    
                // Add event listener to the button (for when it's clicked)
                button.addEventListener('click', () => {
                    setItemPropertiesModal(match);
                });
    
                return button.outerHTML;  // Return the button as HTML
            });
    
            // If the text content has changed (i.e., we found a match), replace the node's content
            if (newText !== priceText) {
                // Create a temporary container to parse the HTML
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = newText;
                
                // Get the button element from the parsed HTML
                const button = tempContainer.querySelector('button');
                
                // Add the event listener to the newly created button
                button.addEventListener('click', () => {
                    setItemPropertiesModal(button.innerText);
                });
                
                // Replace the text node with the button
                node.replaceWith(button);
            }
        } else if (node.nodeType === 1 && node.childNodes && !['SCRIPT', 'STYLE'].includes(node.tagName)) {
            // Recursively walk through the child nodes of the element
            node.childNodes.forEach(walk);
        }
    };
    
    // Trigger the walk function on the body of the document
    walk(document.body);
}
  
// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "replacePrices") {
        replacePricesWithButtons();
    }
});

function setItemPropertiesModal(price){
    // Create the modal container
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';

    // Create shadow root for style isolation
    const shadowRoot = modal.attachShadow({ mode: 'open' });

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .modal-content {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            width: 300px;
            position: relative;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.25);
        }
        .close-button {
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 16px;
            border: none;
            background: none;
            cursor: pointer;
            padding: 0;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input, select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
        }
        button[type="submit"] {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        button[type="button"] {
            background-color: #f44336;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-left: 10px;
        }
        .button-group {
            margin-top: 20px;
            display: flex;
            justify-content: center;
            gap: 10px;
        }
    `;
    shadowRoot.appendChild(style);

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.innerHTML = `
        <button class="close-button">✖</button>
        <h3>Price: ${price}</h3>
        <form id="price-form">
            <div class="form-group">
                <label for="item-name">Item Name:</label>
                <input type="text" id="item-name" required>
            </div>
            <div class="form-group">
                <label for="country">Country:</label>
                <select id="country" required></select>
            </div>
            <div class="form-group">
                <label for="product-type">Product Type:</label>
                <select id="product-type" required></select>
            </div>
            <div class="form-group">
                <label for="pricing-model">Pricing Model:</label>
                <select id="pricing-model" required>
                    <option value="true">Percentage</option>
                    <option value="false">Gross Sum</option>
                </select>
            </div>
            <div class="button-group">
                <button type="submit">Submit</button>
                <button type="button" id="cancel-btn">Cancel</button>
            </div>
        </form>
    `;

    shadowRoot.appendChild(modalContent);
    document.body.appendChild(modal);

    // Populate the country dropdown
    const countrySelect = shadowRoot.querySelector('#country');
    Object.keys(countryMap).forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });

    // Populate the category dropdown
    const categorySelect = shadowRoot.querySelector('#product-type');
    Object.keys(categoryMap).forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    // Close modal on ❌ button
    shadowRoot.querySelector('.close-button').addEventListener('click', () => {
        modal.remove();
    });

    // Cancel button
    shadowRoot.querySelector('#cancel-btn').addEventListener('click', () => {
        modal.remove();
    });

    // Submit button
    const form = shadowRoot.querySelector('#price-form');
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const itemName = shadowRoot.querySelector('#item-name').value;
        const country = shadowRoot.querySelector('#country').value;
        const productType = shadowRoot.querySelector('#product-type').value;
        const pricingModel = shadowRoot.querySelector('#pricing-model').value;
        const basePrice = price;

        // Create the item object
        const newItem = {
            id: Date.now(), // Unique identifier
            itemName,
            country,
            productType,
            pricingModel: pricingModel === 'true',
            basePrice,
            url: window.location.href
        };

        // Get existing items from storage and add the new item
        chrome.storage.sync.get(['tariffItems'], function(result) {
            let items = result.tariffItems || [];
            items.push(newItem);
            
            // Save back to storage
            chrome.storage.sync.set({ tariffItems: items }, function() {
                console.log('Item saved:', newItem);
                modal.remove();
            });
        });
    });
}