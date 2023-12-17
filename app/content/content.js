// Add the overlay to the page
const overlay = document.createElement('div');
// ... (overlay styling as previously defined)

// Initially hide the overlay
overlay.style.display = 'none';
document.body.appendChild(overlay);

// ... (Event listeners for mouse actions as previously defined)

// Function to show the overlay and initiate capturing
function initiateCapture() {
    overlay.style.display = 'block';
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "capture") {
        initiateCapture();
    }
});

const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.zIndex = '9999';
overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
document.body.appendChild(overlay);

let startX, startY, rect;
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
    captureRegion(startX, startY, rect.offsetWidth, rect.offsetHeight);
    rect.remove();
    rect = null;
});

function captureRegion(x, y, width, height) {
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, -x, -y);
            const croppedDataUrl = canvas.toDataURL('image/png');

            // Display the cropped image
            const croppedImage = document.createElement('img');
            croppedImage.src = croppedDataUrl;
            document.body.appendChild(croppedImage);
            
            // Or download the cropped image
            // const downloadLink = document.createElement('a');
            // downloadLink.href = croppedDataUrl;
            // downloadLink.download = 'cropped-image.png';
            // document.body.appendChild(downloadLink);
            // downloadLink.click();
            // document.body.removeChild(downloadLink);
        };
        img.src = dataUrl;
    });
}
