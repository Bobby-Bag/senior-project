// Bobby add all of this (very important)  ->

// THOMAS CHANGED THIS TO ADD BOUNDARIES TO THE MAP
var map = L.map('map', {
    // Set the initial view to a coordinate and zoom level suitable for your use-case
    center: [29.7604, -95.3698], // Example coordinates (can be customized)
    zoom: 6, // Initial zoom level
    minZoom: 3, // Set the minimum zoom level to lock how far you can zoom out
    maxBounds: [
        // Full bounds for the entire Earth
        [-95, -185], // Southwest bounds
        [95, 185]   // Northeast bounds
    ],
    maxBoundsViscosity: 0.9 // Ensures the map does not move outside these bounds
});


// Load and display the tile layer from OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
//<input type="file" id="fileInput" style="display: none;" accept="image/*">
// Function to create a marker and add it to the map


// THOMAS NGUYEN ADDED  ESRI Satellite layer to the map FOR SAT VIEWS 5x code "vars"
// Add the default OpenStreetMap tile layer to the map
var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// Add the ESRI Satellite layer to the map
var esriSatellite = L.esri.basemapLayer('Imagery');

// Add the CartoDB Dark Matter tile layer for night mode
var darkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
});

// Create a baseMaps object to hold all the tile layers
var baseMaps = {
    "Street View": osmLayer,
    "Satellite View": esriSatellite,
    "Night Mode": darkMatter,
};

// Add the default OpenStreetMap layer to the map
osmLayer.addTo(map);

// Add layer control to the map to toggle between Street View and Satellite View
L.control.layers(baseMaps).addTo(map);

// THOMAS NGUYEN ADDED Geocoder (search bar) control to the map for SEARCH BAR
var geocoder = L.Control.Geocoder.nominatim();
L.Control.geocoder({
    position: 'topleft', // Positioning the search bar at the top-left
    geocoder: geocoder,
    placeholder: "Search for a location...", // Placeholder text in the search bar
    defaultMarkGeocode: false // Prevent default behavior of dropping a pin
})
.on('markgeocode', function(e) {
    // Custom behavior to update map's view without dropping a pin
    var bbox = e.geocode.bbox;
    map.flyToBounds(bbox, { animate: true, duration: 2 }); // Smoothly zoom to the searched location
})
.addTo(map);

function createMarker(lat, lng) {
    var marker = L.marker([lat, lng]).addTo(map);

    marker.bindPopup(getPopupContent(lat, lng)).openPopup();

    savePin(lat, lng);
    return marker;
}

function triggerFileInput(lat, lng) {
    const fileInput = document.getElementById('fileInput');
    fileInput.dataset.lat = lat;
    fileInput.dataset.lng = lng;

    // Add an event listener that triggers uploadFile when a file is selected
    fileInput.onchange = uploadFile;
    fileInput.click();  // Trigger the file input dialog
}

const markers = {};

function createMarkersOnLoad(lat, lng) {
    const roundedLat = lat.toFixed(5);
    const roundedLng = lng.toFixed(5);

    const marker = L.marker([lat, lng]).addTo(map);
    markers[`${roundedLat},${roundedLng}`] = marker;

    // Fetch existing photos for this pin and update popup
    fetch(`/get_pin?lat=${roundedLat}&lng=${roundedLng}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                marker.bindPopup(getPopupContent(lat, lng, data.pin.photos)).openPopup();
            } else {
                marker.bindPopup(getPopupContent(lat, lng)).openPopup();
                console.error("No photos found for pin:", data.message);
            }
        })
        .catch(error => {
            console.error("Error fetching photos for pin:", error);
        });
}



function getPopupContent(lat, lng, photos = []) {
    let photoGallery = photos.map(url => `<img src="${url.substring(8)}" width="100" height="100" style="margin: 5px;">`).join('');
    return `<b>Marker at ${lat.toFixed(5)}, ${lng.toFixed(5)}</b><br>
            ${photoGallery}<br>
            <button onclick="deleteMarker(${lat}, ${lng})">Delete Marker</button><br>
            <button onclick="triggerFileInput(${lat}, ${lng})">Upload Photo</button>
            <input type="file" id="fileInput" style="display: none;"
                   data-lat="${lat}" data-lng="${lng}" onchange="uploadFile()" accept="image/*">`;
}


function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file to upload.");
        return;
    }

    // Retrieve lat and lng from data attributes on fileInput
    const lat = parseFloat(fileInput.getAttribute('data-lat'));
    const lng = parseFloat(fileInput.getAttribute('data-lng'));

    // Debugging: Log latitude and longitude to verify they are numbers
    console.log("Latitude:", lat, "Longitude:", lng);

    if (isNaN(lat) || isNaN(lng)) {
        console.error("Invalid latitude or longitude values:", lat, lng);
        return;
    }

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('lat', lat);
    formData.append('lng', lng);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log("Upload response:", data);  // Debugging: log response
        if (data.success) {
            alert("Photo uploaded successfully!");
            updateMarkerPopup(lat, lng, data.photos);  // Update popup with new photos
        } else {
            alert("Failed to upload photo: " + data.message);
        }
    })
    .catch(error => {
        console.error("Error in upload request:", error);
        alert("Error uploading photo.");
    });
}
function deleteFile(lat, lng, photos = []) {
    let photoGallery = photos.map(url => `<img src="${url.substring(8)}" width="100" height="100" style="margin: 5px;">`).join('');
    return `<b>Marker at ${lat.toFixed(5)}, ${lng.toFixed(5)}</b><br>
            ${photoGallery}<br>
            <button onclick="deleteMarker(${lat}, ${lng})">Delete Marker</button><br>
            <button onclick="triggerFileInput(${lat}, ${lng})">Upload Photo</button>
            <input type="file" id="fileInput" style="display: none;"
                   data-lat="${lat}" data-lng="${lng}" onchange="uploadFile()" accept="image/*">`;
}



function updateMarkerPopup(lat, lng) {
    const roundedLat = lat.toFixed(5);
    const roundedLng = lng.toFixed(5);

    // Access the marker from the global markers dictionary
    const marker = markers[`${roundedLat},${roundedLng}`];
    if (!marker) {
        console.error(`Marker not found for coordinates: ${roundedLat}, ${roundedLng}`);
        return;
    }

    // Fetch the latest data for this pin
    fetch(`/get_pin?lat=${roundedLat}&lng=${roundedLng}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update marker's popup content with the latest photos or other data
                marker.setPopupContent(getPopupContent(lat, lng, data.pin.photos)).openPopup();
            } else {
                console.error("Failed to load pin data:", data.message);
            }
        })
        .catch(error => {
            console.error("Error fetching pin data:", error);
        });
}


// Function to save a pin using a POST request
function savePin(lat, lng) {
    fetch('/add_pin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lat: lat, lng: lng })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
    })
    .catch(error => {
        console.error('Error adding pin:', error);
    });
}
function deletePhotos(lat, lng) {
    // Define the URL with query parameters for latitude and longitude
    const url = `/delete_photos?lat=${lat}&lng=${lng}`;

    // Make a GET request to the delete_photos route
    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include' // Include credentials for authentication
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(data.message);
            alert("Photos deleted successfully!");
            // Additional code to update the UI, if needed
        } else {
            console.error(data.message);
            alert(`Failed to delete photos: ${data.message}`);
        }
    })
    .catch(error => {
        console.error("Error deleting photos:", error);
        alert("An error occurred while attempting to delete photos.");
    });
}
// Function to delete a marker and remove it from the map and database
function deleteMarker(lat, lng) {
    const roundedLat = lat.toFixed(5);
    const roundedLng = lng.toFixed(5);

    deletePhotos(roundedLat, roundedLng)

     fetch('/delete_pin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lat: lat, lng: lng })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            map.eachLayer(function (layer) {
                if (layer instanceof L.Marker && layer.getLatLng().lat === lat && layer.getLatLng().lng === lng) {
                    map.removeLayer(layer);
                }
            });
            console.log(data.message);
        }
    })
    .catch(error => {
        console.error('Error deleting pin:', error);
    });
}

// Add a click event listener to the map
map.on('click', function(e) {
    var lat = e.latlng.lat;
    var lng = e.latlng.lng;

    // Create a marker at the clicked location
    createMarker(parseFloat(lat), parseFloat(lng));
});

// Load existing pins when the map is loaded
document.addEventListener('DOMContentLoaded', function() {
    fetch('/get_pins')
    .then(response => response.json())
    .then(pins => {
        pins.forEach(pin => {
            createMarkersOnLoad(parseFloat(pin.lat), parseFloat(pin.lng));
        });
    })
    .catch(error => {
        console.error('Error loading pins:', error);
    });
});