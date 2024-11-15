// Initialize the map
var map = L.map('map', {
    center: [29.7604, -95.3698], // Example coordinates
    zoom: 6, // Initial zoom level
    minZoom: 3,
    maxBounds: [[-95, -185], [95, 185]], // Map boundaries
    maxBoundsViscosity: 0.9, // Restrict map movement within bounds
    doubleClickZoom: false // Disable zoom on double click
});

// Add tile layers
var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
});
var esriSatellite = L.esri.basemapLayer('Imagery');
var darkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO'
});

// Base maps for layer control
var baseMaps = {
    "Street View": osmLayer,
    "Satellite View": esriSatellite,
    "Night Mode": darkMatter,
};

// Add OpenStreetMap layer as default
osmLayer.addTo(map);

// Add layer control to the map
L.control.layers(baseMaps).addTo(map);

// Add geocoder control
var geocoder = L.Control.Geocoder.nominatim();
L.Control.geocoder({
    position: 'topleft',
    geocoder: geocoder,
    placeholder: "Search for a location...",
    defaultMarkGeocode: false
})
.on('markgeocode', function (e) {
    var bbox = e.geocode.bbox;
    map.flyToBounds(bbox, { animate: true, duration: 2 });
})
    .addTo(map);

// Global dictionary to store markers
const markers = {};

// Function to create a marker and add it to the map
function createMarker(lat, lng) {
    const roundedLat = lat.toFixed(5);
    const roundedLng = lng.toFixed(5);
    const marker = L.marker([lat, lng]).addTo(map);
    markers[`${roundedLat},${roundedLng}`] = marker;

    // Fetch existing photos and bind popup
    fetch(`/get_pin?lat=${roundedLat}&lng=${roundedLng}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Delete pin if it does not have any photos
                if (data.pin.photos.length === 0) {
                    deleteMarker(lat, lng);
                } else {
                    marker.bindPopup(getPopupContent(lat, lng, data.pin.photos), { autoClose: false }).openPopup();
                    adjustImageSizes(); // Adjust image sizes when the popup opens
                }
            } else {
                marker.bindPopup(getPopupContent(lat, lng), { autoClose: false }).openPopup();
                adjustImageSizes(); // Adjust image sizes when the popup opens
            }
        }).catch(error => {
            console.error("Error fetching photos for pin:", error);
        });

    savePin(lat, lng);

    return marker;
}

// Function to create markers on initial load
function createMarkersOnLoad(lat, lng) {
    const roundedLat = lat.toFixed(5);
    const roundedLng = lng.toFixed(5);

    const marker = L.marker([lat, lng]).addTo(map);
    markers[`${roundedLat},${roundedLng}`] = marker;

    fetch(`/get_pin?lat=${roundedLat}&lng=${roundedLng}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.pin.photos.length === 0) {
                    // Delete pin if it does not have any photos
                    deleteMarker(lat, lng);
                } else {
                    marker.bindPopup(getPopupContent(lat, lng, data.pin.photos), { autoClose: false }).openPopup();
                    adjustImageSizes(); // Adjust image sizes when the popup opens
                }
            } else {
                marker.bindPopup(getPopupContent(lat, lng), { autoClose: false }).openPopup();
                adjustImageSizes(); // Adjust image sizes when the popup opens
            }
        }).catch(error => {
            console.error("Error fetching photos for pin:", error);
        });
}

// Function to get popup content
function getPopupContent(lat, lng, photos = []) {
    let photoGallery = photos.map(url =>
        `<img class="map-photo" src="${url.substring(8)}" 
              style="margin: 5px; object-fit: contain; transition: width 0.2s, height 0.2s;">`).join('');

    // Conditional rendering of the "Upload" button
    const uploadButton = photos.length > 0 ? '' : `<button onclick="triggerFileInput(${lat}, ${lng})" style="font-size: 0.75em; padding: 3px 5px;">Upload</button>`;

    return `<div class="popup-content" style="width: 220px; padding: 5px; box-sizing: border-box; border: 0px solid black;">
                <div style="display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;">
                    ${photoGallery}
                </div>
                <div style="display: flex; gap: 5px; margin-top: 5px; justify-content: center;">
                    <button onclick="deleteMarker(${lat}, ${lng})" style="font-size: 0.75em; padding: 3px 5px;">Delete</button>
                    ${uploadButton}
                </div>
                <input type="file" id="fileInput" style="display: none;" accept="image/*">
            </div>`;
}
// Function to adjust image sizes based on the zoom level
function adjustImageSizes() {
    const zoom = map.getZoom();
    const images = document.querySelectorAll('.map-photo');

    // Set new minimum and maximum sizes for the images
    const minSize = 100;   // Increased minimum size
    const maxSize = 200;  // Increased maximum size

    // Calculate the size based on the zoom level, ensure it's within [minSize, maxSize] range
    const size = Math.min(maxSize, Math.max(minSize, zoom * 10));

    images.forEach(img => {
        img.style.width = `${size}px`;
        img.style.height = `${size}px`;
        img.style.objectFit = 'contain'; // Ensure image retains its aspect ratio
        img.style.transition = 'width 0.2s, height 0.2s'; // Smooth transition for size change
        img.style.maxWidth = `${maxSize}px`; // Maximum width to prevent overflow
        img.style.maxHeight = `${maxSize}px`; // Maximum height to prevent overflow
    });
}



// Function to initialize or show the popup with the content
function showPopup(lat, lng, photos = []) {
    const popupContent = getPopupContent(lat, lng, photos);
    // Example of creating and showing the popup
    const popupElement = document.createElement('div');
    popupElement.innerHTML = popupContent;
    document.body.appendChild(popupElement); // This should be adapted based on how you add the popup

    if (photos.length > 0) {
        // Condition to ensure it always shows if there are photos
        popupElement.classList.add('always-visible');
    } else {
        popupElement.classList.remove('always-visible');
    }

    // Logic to show the popup, this is a simple example
    popupElement.style.position = 'absolute'; // Position it based on lat/lng for example
    popupElement.style.top = `${lat}px`; // Example position
    popupElement.style.left = `${lng}px`; // Example position
}

// Function to trigger file input for uploading photo
function triggerFileInput(lat, lng) {
    const fileInput = document.getElementById('fileInput');
    fileInput.dataset.lat = lat;
    fileInput.dataset.lng = lng;
    fileInput.onchange = uploadFile;
    fileInput.click();
}

// Function to handle photo upload
function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const lat = parseFloat(fileInput.dataset.lat);
    const lng = parseFloat(fileInput.dataset.lng);

    if (!file) {
        alert("Please select a file to upload.");
        return;
    }

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('lat', lat);
    formData.append('lng', lng);

    fetch('/upload', {
        method: 'POST',
        body: formData
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Photo uploaded successfully!");
                updateMarkerPopup(lat, lng); // Update the marker's popup with new photos
            } else {
                alert("Failed to upload photo: " + data.message);
            }
        }).catch(error => console.error("Error in upload request:", error));
}

// Function to update marker popup content
// Call this function whenever the popup content is shown or updated
function updateMarkerPopup(lat, lng) {
    const roundedLat = lat.toFixed(5);
    const roundedLng = lng.toFixed(5);
    const marker = markers[`${roundedLat},${roundedLng}`];

    if (!marker) {
        console.error(`Marker not found for coordinates: ${roundedLat}, ${roundedLng}`);
        return;
    }

    fetch(`/get_pin?lat=${roundedLat}&lng=${roundedLng}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                marker.setPopupContent(getPopupContent(lat, lng, data.pin.photos)).openPopup();
                adjustImageSizes(); // Ensure image sizes are adjusted
            } else {
                console.error("Failed to load pin data:", data.message);
            }
        }).catch(error => console.error("Error fetching pin data:", error));
}
// Function to save pin to the database
function savePin(lat, lng) {
    fetch('/add_pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
    }).then(response => response.json())
        .then(data => console.log(data.message))
        .catch(error => console.error('Error adding pin:', error));
}

// Function to delete a marker and its associated photos
function deleteMarker(lat, lng) {
    const roundedLat = lat.toFixed(5);
    const roundedLng = lng.toFixed(5);

    deletePhotos(roundedLat, roundedLng);

    fetch('/delete_pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
    }).then(response => response.json())
        .then(data => {
            if (data.message) {
                map.eachLayer(layer => {
                    if (layer instanceof L.Marker && layer.getLatLng().equals([lat, lng])) {
                        map.removeLayer(layer);
                    }
                });
                console.log(data.message);
            }
        }).catch(error => console.error('Error deleting pin:', error));
}

// Function to delete photos
function deletePhotos(lat, lng) {
    fetch(`/delete_photos?lat=${lat}&lng=${lng}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                // Silently delete photos without alerting the user
                console.log("Photos deleted successfully");
                updateMarkerPopup(parseFloat(lat), parseFloat(lng));  // Refresh the marker popup to reflect photo deletion
            } else {
                console.error("Failed to delete photos: " + data.message);
            }
        }).catch(error => console.error("Error deleting photos:", error));
}

// Event listener to create a marker on map click
map.on('dblclick', function (e) {
    createMarker(e.latlng.lat, e.latlng.lng);
});

document.addEventListener('DOMContentLoaded', function () {
    fetch('/get_pins')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(pins => {
            pins.forEach(pin => {
                const lat = parseFloat(pin.lat); // Convert latitude to float
                const lng = parseFloat(pin.lng); // Convert longitude to float
                if (!isNaN(lat) && !isNaN(lng)) {
                    createMarkersOnLoad(lat, lng); // Create and add marker on map
                } else {
                    console.error('Invalid pin data:', pin); // Log invalid pin data
                }
            });
        })
        .catch(error => {
            console.error('Error loading pins:', error); // Catch and log any fetch errors
        });
});

// Adjust image sizes initially to set a reasonable starting size
adjustImageSizes();

// Add zoom event listener to adjust image sizes smoothly
map.on('zoom', adjustImageSizes);


// Enhanced error logging example for deleting photos
function deletePhotos(lat, lng) {
    fetch(`/delete_photos?lat=${lat}&lng=${lng}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    }).then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }).then(data => {
        if (data.success) {
            console.log("Photos deleted successfully");
            updateMarkerPopup(parseFloat(lat), parseFloat(lng));
        } else {
            console.error("Failed to delete photos: " + data.message);
        }
    }).catch(error => console.error("Error deleting photos:", error));
}

const style = document.createElement('style');
style.innerHTML = `
    .leaflet-popup-content-wrapper {
        border: none !important;
        padding: 0 !important;
        background: none !important;
    }

    .leaflet-popup-tip-container {
        display: none !important;
    }

    .leaflet-popup-content {
        margin: 0 !important;
        padding: 0 !important;
        background: none !important;
    }

    .popup-content {
        box-shadow: none !important;
        background: transparent !important;
    }
`;
document.head.appendChild(style);