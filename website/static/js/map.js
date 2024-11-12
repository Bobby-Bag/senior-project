// Initialize the map and set its view
var map = L.map('map').setView([51.505, -0.09], 13);

// Load and display the tile layer from OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

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

        // Provide a default title
        var title = "Marker";

        createMarker(lat, lng, title);
    }
});

// Function to create a marker and add it to the map
function createMarker(lat, lng, title) {
    console.log(`Creating marker at ${lat}, ${lng} with title: ${title}`);

    var marker = L.marker([lat, lng], { title: title }).addTo(markerLayer);

    var fileInputId = 'fileInput-' + lat + '-' + lng; // Create a unique ID for each marker

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

// Function to delete a marker and remove it from the map and database
function deleteMarker(lat, lng) {
    fetchData('/delete_pin', 'POST', { lat, lng })
        .then(data => {
            if (data.message) {
                map.eachLayer(function (layer) {
                    if (layer instanceof L.Marker && layer.getLatLng().lat === lat && layer.getLatLng().lng === lng) {
                        map.removeLayer(layer); // Remove the marker from the map
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
    document.getElementById(fileInputId).click(); // Trigger the file input click event
    document.getElementById(fileInputId).onchange = function(event) {
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
        if (data.message) {
            alert('Photo uploaded successfully!');
        } else {
            alert('Error uploading photo.');
        }
    })
    .catch(error => console.error('Error uploading photo:', error));
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

function searchLocation() {
    var searchInput = document.getElementById('searchInput').value;
    var url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json&limit=1`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                var lat = data[0].lat;
                var lon = data[0].lon;
                console.log(`Found location: ${lat}, ${lon}`);

                // Use flyTo for a smooth and quick transition with a less close zoom level
                map.flyTo(new L.LatLng(lat, lon), 10, { // Zoom level 10 instead of 13
                    duration: 2, // Duration in seconds, adjust as needed
                    easeLinearity: 0.25 // Adjust easing for smoothness
                });
            } else {
                alert('Location not found.');
            }
        })
        .catch(error => console.error('Error:', error));
}