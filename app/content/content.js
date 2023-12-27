// Add the overlay to the page
let overlay;
let startX, startY, rect, offsetX, offsetY;
let uniqueIdCounter = 0;

function initiateCapture() {
    overlay = document.createElement('div');
    overlay.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; background-color: rgba(0, 0, 0, 0.5);';
    document.body.appendChild(overlay);

    overlay.addEventListener('mousedown', handleMouseDown);
    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('mouseup', handleMouseUp);
}

function handleMouseDown(event) {
    startX = event.pageX - window.scrollX;
    startY = event.pageY - window.scrollY;
    rect = document.createElement('div');
    rect.style = 'position: absolute; border: 2px solid blue; background-color: rgba(0, 0, 255, 0.3); left: ' + startX + 'px; top: ' + startY + 'px;';
    overlay.appendChild(rect);
}

function handleMouseMove(event) {
    if (!rect) return;
    const width = event.pageX - window.scrollX - startX;
    const height = event.pageY - window.scrollY - startY;
    rect.style.width = width + 'px';
    rect.style.height = height + 'px';
}

function handleMouseUp() {
    if (rect) {
        const zoomLevel = window.devicePixelRatio;
        const adjustedX = startX;
        const adjustedY = startY;
        const adjustedWidth = rect.offsetWidth * zoomLevel;
        const adjustedHeight = rect.offsetHeight * zoomLevel;
        const rectWidth = rect.offsetWidth;
        const rectHeight = rect.offsetHeight;
        rect.remove();
        overlay.remove();

        chrome.runtime.sendMessage({ action: "captureTab" }, async (response) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = adjustedWidth;
                canvas.height = adjustedHeight;
                ctx.drawImage(img, -adjustedX * zoomLevel, -adjustedY * zoomLevel);

                const croppedDataUrl = canvas.toDataURL('image/png');
                downloadFile(croppedDataUrl, 'screenshot.png');

                let htmlString = captureElementsAndStyles(adjustedX, adjustedY, rectWidth, rectHeight);
                const blob = new Blob([htmlString], { type: 'text/html' });
                downloadFile(URL.createObjectURL(blob), 'captured-elements.html');
            };
            img.src = response.dataUrl;
        });
    }
    rect = null;
}


function captureElementsAndStyles(x, y, width, height) {
    const zoomLevel = window.devicePixelRatio;
    // x /= .5;
    // y /= .5;
    width /= .5;
    height /= .5;
    const capturedAreaHtml = document.createElement('div');
    capturedAreaHtml.style.cssText = `width: ${width}px; height: ${height}px; overflow: hidden;`;
    let styleRules = '';

    function captureElement(el) {
        if (el.dataset.captured) return '';
        el.dataset.captured = 'true';
    
        const uniqueClass = `capturedClass-${uniqueIdCounter++}`;
        const existingClasses = el.className ? `${el.className} ` : '';
        const combinedClasses = `${existingClasses}${uniqueClass}`;
        el.dataset.uniqueClass = uniqueClass;
    
        const computedStyle = window.getComputedStyle(el);
        const styleString = Array.from(computedStyle).map(prop => `${prop}: ${computedStyle.getPropertyValue(prop)}`).join('; ');
        styleRules += `.${uniqueClass} { ${styleString} }\n`;
    
        let htmlString = `<${el.tagName.toLowerCase()} class="${combinedClasses}"`;
    
        Array.from(el.attributes).forEach(attr => {
            if (attr.name !== 'style' && attr.name !== 'class') {
                htmlString += ` ${attr.name}="${attr.value}"`;
            }
        });
    
        htmlString += '>';
    
        Array.from(el.childNodes).forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                htmlString += captureElement(child);
            } else if (child.nodeType === Node.TEXT_NODE) {
                htmlString += child.textContent;
            }
        });
    
        htmlString += `</${el.tagName.toLowerCase()}>`;
        return htmlString;
    }
    

    document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top >= y && rect.left >= x && rect.bottom <= y + height && rect.right <= x + width && !el.closest('[data-captured="true"]')) {
            capturedAreaHtml.innerHTML += captureElement(el);
        }
    });
    const styleBlock = document.createElement('style');
    styleBlock.innerHTML = styleRules;
    capturedAreaHtml.prepend(styleBlock);

    return capturedAreaHtml.outerHTML;
}

function downloadFile(dataUrl, filename) {
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "capture") {
        initiateCapture();
    }
});