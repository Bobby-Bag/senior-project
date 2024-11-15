// Initialize the map
var map = L.map('map', {
    center: [29.7604, -95.3698], // Example coordinates
    zoom: 6, // Initial zoom level
    minZoom: 3,
    maxBounds: [[-95, -185], [95, 185]], // Map boundaries
    maxBoundsViscosity: 0.9 // Restrict map movement within bounds
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
.on('markgeocode', function(e) {
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
                marker.bindPopup(getPopupContent(lat, lng, data.pin.photos)).openPopup();
            } else {
                marker.bindPopup(getPopupContent(lat, lng)).openPopup();
            }
        }).catch(error => console.error("Error fetching photos for pin:", error));

    savePin(lat, lng);
    return marker;
}

// Function to trigger file input for uploading photo
function triggerFileInput(lat, lng) {
    const fileInput = document.getElementById('fileInput');
    fileInput.dataset.lat = lat;
    fileInput.dataset.lng = lng;
    fileInput.onchange = uploadFile;
    fileInput.click();
}

// Function to create marker upon loading
function createMarkersOnLoad(lat, lng) {
    const roundedLat = lat.toFixed(5);
    const roundedLng = lng.toFixed(5);

    const marker = L.marker([lat, lng]).addTo(map);
    markers[`${roundedLat},${roundedLng}`] = marker;

    fetch(`/get_pin?lat=${roundedLat}&lng=${roundedLng}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                marker.bindPopup(getPopupContent(lat, lng, data.pin.photos)).openPopup();
            } else {
                marker.bindPopup(getPopupContent(lat, lng)).openPopup();
            }
        }).catch(error => console.error("Error fetching photos for pin:", error));
}

// Function to get popup content
function getPopupContent(lat, lng, photos = []) {
    let photoGallery = photos.map(url => `<img src="${url.substring(8)}" width="100" height="100" style="margin: 5px;">`).join('');
    return `<b>Marker at ${lat.toFixed(5)}, ${lng.toFixed(5)}</b><br>
            ${photoGallery}<br>
            <button onclick="deleteMarker(${lat}, ${lng})">Delete Marker</button><br>
            <button onclick="triggerFileInput(${lat}, ${lng})">Upload Photo</button>
            <input type="file" id="fileInput" style="display: none;" accept="image/*">`;
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
              alert("Photos deleted successfully!");
              updateMarkerPopup(parseFloat(lat), parseFloat(lng));  // Refresh the marker popup to reflect photo deletion
          } else {
              alert("Failed to delete photos: " + data.message);
          }
      }).catch(error => console.error("Error deleting photos:", error));
}

// Event listener to create a marker on map click
map.on('click', function(e) {
    createMarker(e.latlng.lat, e.latlng.lng);
});

// Load existing pins when the map is loaded
document.addEventListener('DOMContentLoaded', function() {
    fetch('/get_pins')
    .then(response => response.json())
    .then(pins => {
        pins.forEach(pin => createMarkersOnLoad(parseFloat(pin.lat), parseFloat(pin.lng)));
    }).catch(error => console.error('Error loading pins:', error));
});