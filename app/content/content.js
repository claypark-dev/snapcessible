// Add the overlay to the page
let overlay;


let startX, startY, rect, offsetX, offSetY;

// Function to show the overlay and initiate capturing
function initiateCapture() {
    overlay = document.createElement('div');
    overlay.style.display = 'block';
    // Initially hide the overlay
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '9999';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    document.body.appendChild(overlay);
    overlay.addEventListener('mousedown', (event) => {
        startX = event.pageX;
        startY = event.pageY;
        rect = document.createElement('div');
        rect.style.position = 'absolute';
        rect.style.border = '2px solid blue';
        rect.style.backgroundColor = 'rgba(0, 0, 255, 0.3)';
        rect.style.left = `${startX}px`;
        rect.style.top = `${startY}px`;
        overlay.appendChild(rect);
    });
    
    overlay.addEventListener('mousemove', (event) => {
        if (!rect) return;
        const width = event.pageX - startX;
        const height = event.pageY - startY;
        rect.style.width = `${width}px`;
        rect.style.height = `${height}px`;
    });
    
    overlay.addEventListener('mouseup', () => {
        if (rect) {
            offsetX = rect.offsetWidth;
            offsetY = rect.offsetHeight;
            rect.remove();
            rect = null;
            overlay.remove(); // To completely remove from the DOM
            
            // Send message to background script
            chrome.runtime.sendMessage({action: "captureTab"}, (response) => {
                // Use response.dataUrl to create and manipulate a canvas
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = offsetX;
                    canvas.height = offsetY;
                    ctx.drawImage(img, -startX, -startY);
                    // Further processing of the canvas, like displaying or downloading
                    const croppedDataUrl = canvas.toDataURL('image/png');
                    // Automatic download
                    const downloadLink = document.createElement('a');
                    downloadLink.href = croppedDataUrl;
                    downloadLink.download = 'screenshot.png';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                };
                img.src = response.dataUrl;
            });
            // Start of reading dom for screenshot
            let htmlString = captureElementsAndStyles(startX, startY, offsetX, offsetY);
            const blob = new Blob([htmlString], { type: 'text/html' });
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = 'captured-elements.html';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        } else {
            rect = null;
        }
    });
}

function captureElementsAndStyles(x, y, width, height) {
    // Create a container div for the captured area
    const capturedAreaHtml = document.createElement('div');
    capturedAreaHtml.style.cssText = `width: ${width}px; height: ${height}px; overflow: hidden;`;

    // Function to capture an individual element
    function captureElement(el) {
        if (el.dataset.captured) return ''; // Skip already captured elements
        el.dataset.captured = 'true'; // Mark the element as captured

        const computedStyle = window.getComputedStyle(el);
        const styleString = Array.from(computedStyle).map(prop => `${prop}: ${computedStyle.getPropertyValue(prop)}`).join('; ');

        let htmlString = `<${el.tagName.toLowerCase()} style="${styleString}"`;

        // Copy all attributes of the element
        Array.from(el.attributes).forEach(attr => {
            htmlString += ` ${attr.name}="${attr.value}"`;
        });

        htmlString += '>'; // Close the opening tag

        // Recursively capture child nodes
        Array.from(el.childNodes).forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                htmlString += captureElement(child);
            } else if (child.nodeType === Node.TEXT_NODE) {
                htmlString += child.textContent;
            }
        });

        htmlString += `</${el.tagName.toLowerCase()}>`; // Close the element tag
        return htmlString;
    }

    // Iterate over all elements and capture those within the specified area
    document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top >= y && rect.left >= x && rect.bottom <= y + height && rect.right <= x + width && !el.closest('[data-captured="true"]')) {
            capturedAreaHtml.innerHTML += captureElement(el);
        }
    });

    return capturedAreaHtml.outerHTML; // Return the HTML of the captured area
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "capture") {
        initiateCapture();
    }
});
