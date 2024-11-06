// Initialize the map and set its view
var map = L.map('map').setView([51.505, -0.09], 13);

// Load and display the tile layer from OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Function to create a marker and add it to the map
function createMarker(lat, lng) {
    var marker = L.marker([lat, lng]).addTo(map);

    // Bind a popup to the marker with a delete option
    marker.bindPopup(
        `<b>Marker at ${lat.toFixed(5)}, ${lng.toFixed(5)}</b><br>
        <button onclick="deleteMarker(${lat}, ${lng})">Delete Marker</button>
        <!-- Button to trigger file input -->
        <button onclick="document.getElementById('fileInput').click()">Upload Photo</button>
        <input type="file" id="fileInput" style="display: none;" onchange="uploadFile()" accept="image/*">`
    ).openPopup();

    // Save the marker to the database
    savePin(lat, lng);

    // Return the marker instance
    return marker;
}

function uploadFile() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (file) {
            // Prepare form data for the upload
            const formData = new FormData();
            formData.append('photo', file);

            // Send a POST request to the server to upload the file
            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Photo uploaded successfully!");
                } else {
                    alert("Failed to upload photo.");
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert("Error uploading photo.");
            });
        }
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