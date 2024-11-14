// Bobby add all of this (very important)  ->

// Initialize the map and set its view
var map = L.map('map').setView([51.505, -0.09], 13);

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

    marker.bindPopup(
    `<b>Marker at ${lat.toFixed(5)}, ${lng.toFixed(5)}</b><br>
    <button onclick="deleteMarker(${lat}, ${lng})">Delete Marker</button>
    <button onclick="triggerFileInput(${lat}, ${lng})">Upload Photo</button>
    <input type="file" id="fileInput" style="display: none;" accept="image/*">`
    ).openPopup();

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

function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    // Retrieve lat and lng from data attributes
    const lat = fileInput.dataset.lat;
    const lng = fileInput.dataset.lng;

    if (!file) {
        alert("Please select a file to upload.");
        return;
    }

    if (lat === 'undefined' || lng === 'undefined') {
        alert("Invalid latitude or longitude values.");
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
        if (data.success) {
            alert("Photo uploaded successfully!");
        } else {
            alert("Failed to upload photo: " + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Error uploading photo.");
    });
}

function createMarkersOnLoad(lat, lng) {
    var marker = L.marker([lat, lng]).addTo(map);

    // Bind a popup to the marker with a delete option
    marker.bindPopup(
        `<b>Marker at ${lat.toFixed(5)}, ${lng.toFixed(5)}</b><br>
        <button onclick="deleteMarker(${lat}, ${lng})">Delete Marker</button>
        <!-- Button to trigger file input -->
        <button onclick="document.getElementById('fileInput').click()">Upload Photo</button>
        <input type="file" id="fileInput" style="display: none;" onchange="uploadFile()" accept="image/*">`
    ).openPopup();


    // Return the marker instance
    return marker;
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

// Function to delete a marker and remove it from the map and database
function deleteMarker(lat, lng) {
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