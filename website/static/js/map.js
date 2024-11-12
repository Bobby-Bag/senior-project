// Initialize the map and set its view
var map = L.map('map').setView([51.505, -0.09], 13);

// Load and display the tile layer from OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Hidden file input for photo uploads
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.id = 'fileInput';
fileInput.style.display = 'none';
fileInput.accept = 'image/*';
document.body.appendChild(fileInput);

// Initialize a marker layer group to hold the markers for search
var markerLayer = L.layerGroup().addTo(map);

// Variable to track if "Add Pin" mode is active
var isAddPinMode = false;

// Add event listeners for the "Add Pin" and "Delete Pin" buttons
document.getElementById('addPinButton').addEventListener('click', function() {
    isAddPinMode = true;  // Enable Add Pin mode
    console.log("Add Pin mode is now active.");
});

document.getElementById('deletePinButton').addEventListener('click', function() {
    isAddPinMode = false; // Disable Add Pin mode
    console.log("Delete Pin mode is now active.");
});

// Add a click event listener to the map that adds pins only in "Add Pin" mode
map.on('click', function(e) {
    if (isAddPinMode) {
        var lat = e.latlng.lat;
        var lng = e.latlng.lng;

        createMarker(lat, lng, "Marker");
    }
});

// Function to create a marker and add it to the map
function createMarker(lat, lng, title) {
    console.log(`Creating marker at ${lat}, ${lng} with title: ${title}`);

    var marker = L.marker([lat, lng], { title: title }).addTo(markerLayer);

    var fileInputId = 'fileInput-' + lat.toFixed(5) + '-' + lng.toFixed(5); // Create a unique ID for each marker

    marker.bindPopup(
        `<b>Marker at ${lat.toFixed(5)}, ${lng.toFixed(5)}</b><br>
        <button onclick="deleteMarker(${lat}, ${lng})">Delete Marker</button>
        <button onclick="triggerFileInput('${fileInputId}', ${lat}, ${lng})">Upload Photo</button>
        <input type="file" id="${fileInputId}" style="display: none;" accept="image/*">`
    ).openPopup();

    savePin(lat, lng);
    return marker;
}

// Function to save a pin using a POST request
function savePin(lat, lng) {
    fetchData('/add_pin', 'POST', { lat, lng })
        .then(data => {
            if (data.message) {
                console.log('Pin added successfully:', data.message);
            } else {
                console.error('Failed to add pin. Server response:', data);
            }
        })
        .catch(error => console.error('Error adding pin:', error));
}

// Function to delete a marker and remove it from the map and backend
function deleteMarker(lat, lng) {
    fetchData('/delete_pin', 'POST', { lat, lng })
        .then(data => {
            if (data.message) {
                markerLayer.eachLayer(function (layer) {
                    if (layer instanceof L.Marker && layer.getLatLng().lat === lat && layer.getLatLng().lng === lng) {
                        markerLayer.removeLayer(layer); // Remove the marker from the map
                        console.log(`Marker deleted at ${lat}, ${lng}`);
                    }
                });
            } else {
                alert('Error deleting pin!');
            }
        })
        .catch(error => console.error('Error deleting pin:', error));
}

// Trigger file input programmatically when the user clicks the "Upload Photo" button
function triggerFileInput(fileInputId, lat, lng) {
    const fileInputElem = document.getElementById(fileInputId);
    fileInputElem.click(); // Trigger the file input click event
    fileInputElem.onchange = function(event) {
        uploadFile(event.target.files[0], lat, lng); // Upload the selected file
    };
}

// Handle the file upload and attach it to the marker
function uploadFile(file, lat, lng) {
    if (!file) return;

    var formData = new FormData();
    formData.append("file", file);
    formData.append("lat", lat);
    formData.append("lng", lng);

    fetch('/upload_photo', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.message && data.imageUrl) {
            alert('Photo uploaded successfully!');
            setMarkerIcon(lat, lng, data.imageUrl); // Update the marker with the uploaded image
        } else {
            alert('Error uploading photo.');
        }
    })
    .catch(error => console.error('Error uploading photo:', error));
}

// Function to set a custom marker icon
function setMarkerIcon(lat, lng, imageUrl) {
    markerLayer.eachLayer(function (layer) {
        if (layer instanceof L.Marker && layer.getLatLng().lat === lat && layer.getLatLng().lng === lng) {
            var customIcon = L.icon({
                iconUrl: imageUrl,
                iconSize: [50, 50],
                iconAnchor: [25, 25],
                popupAnchor: [0, -25]
            });

            layer.setIcon(customIcon);

            var newPopupContent = `<b>Marker at ${lat.toFixed(5)}, ${lng.toFixed(5)}</b><br>
                <img src="${imageUrl}" alt="Uploaded Image" style="max-width: 100%; height: auto;"><br>
                <button onclick="deleteMarker(${lat}, ${lng})">Delete Marker</button>
                <button onclick="triggerFileInput('fileInput-${lat.toFixed(5)}-${lng.toFixed(5)}', ${lat}, ${lng})">Upload Photo</button>
                <input type="file" id="fileInput-${lat.toFixed(5)}-${lng.toFixed(5)}" style="display: none;" accept="image/*">`;

            layer.setPopupContent(newPopupContent).openPopup();
        }
    });
}

// Function to fetch data from a given URL with specified method and data
function fetchData(url, method, data) {
    return fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .catch(error => {
        console.error('Fetch error:', error);
        throw error;
    });
}

// Function to load existing pins when the map is loaded
document.addEventListener('DOMContentLoaded', function() {
    fetch('/get_pins')
    .then(response => response.json())
    .then(pins => {
        pins.forEach(pin => {
            createMarker(parseFloat(pin.lat), parseFloat(pin.lng), "Marker");
        });
    })
    .catch(error => {
        console.error('Error loading pins:', error);
    });
});

// Function to search for a location using Nominatim and fly to it on the map
function searchLocation() {
    var searchInput = document.getElementById('searchInput').value;
    var url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json&limit=1`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                var lat = parseFloat(data[0].lat);
                var lon = parseFloat(data[0].lon);
                console.log(`Found location: ${lat}, ${lon}`);

                // Use flyTo for a smooth and quick transition with a less close zoom level
                map.flyTo([lat, lon], 13, {
                    duration: 2, // Duration in seconds, adjust as needed
                    easeLinearity: 0.25 // Adjust easing for smoothness
                });
            } else {
                alert('Location not found.');
            }
        })
        .catch(error => console.error('Error:', error));
}

// Functions to control the sidebar
function openNav() {
    document.getElementById("sidebar").classList.add("open");
}

function closeNav() {
    document.getElementById("sidebar").classList.remove("open");
}

// Add event listener to the search button
document.getElementById('searchButton').addEventListener('click', searchLocation);