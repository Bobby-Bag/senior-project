# Bobby add this (like the whole file) ->
from flask import Blueprint, render_template, request, flash, jsonify
from flask_cors import CORS
from flask_login import login_required, current_user
from .models import Pin, Photo
from . import db
import os
from flask import send_from_directory
from werkzeug.utils import secure_filename
from datetime import datetime
import json

views = Blueprint('views', __name__)
UPLOAD_FOLDER = "/website/uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Ensure the root upload folder exists

@views.route('/', methods=['GET', 'POST'])
@login_required
def home():

    return render_template("home.html", user=current_user)



@views.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# Route to get all pins for the logged-in user
@views.route('/get_pins', methods=['GET'])
@login_required
def get_pins():
    user_id = current_user.id
    pins = Pin.query.filter_by(user_id=user_id).all()
    pins_data = [{'lat': pin.latitude, 'lng': pin.longitude} for pin in pins]
    return jsonify(pins_data)


# Route to add a new pin for the logged-in user
@views.route('/add_pin', methods=['POST'])
@login_required
def add_pin():
    data = request.get_json()
    lat = data.get('lat')
    lng = data.get('lng')

    if lat is None or lng is None:
        return jsonify({'error': 'Invalid latitude or longitude'}), 400

        # Round the latitude and longitude to 5 decimal places
    lat = round(lat, 5)
    lng = round(lng, 5)

    new_pin = Pin(user_id=current_user.id, latitude=lat, longitude=lng)
    db.session.add(new_pin)
    db.session.commit()

    return jsonify({'message': 'Pin added successfully'})


# Route to delete a pin for the logged-in user
@views.route('/delete_pin', methods=['POST'])
@login_required
def delete_pin():
    data = request.get_json()
    lat = data.get('lat')
    lng = data.get('lng')

     # Round the latitude and longitude to 5 decimal places
    lat = round(lat, 5)
    lng = round(lng, 5)

    pin = Pin.query.filter_by(user_id=current_user.id, latitude=float(lat), longitude=float(lng)).first()
    if pin:
        db.session.delete(pin)
        db.session.commit()
        return jsonify({'message': 'Pin deleted successfully'})

    return jsonify({'error': 'Pin not found'}), 404

@views.route('/get_pin', methods=['GET'])
@login_required
def get_pin():
    # Retrieve latitude and longitude from query parameters
    lat = request.args.get('lat')
    lng = request.args.get('lng')

    if not lat or not lng:
        return jsonify({'success': False, 'message': 'Latitude and longitude are required'}), 400

    try:
        # Convert to float with rounding to match precision
        lat = round(float(lat), 5)
        lng = round(float(lng), 5)
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid latitude or longitude format'}), 400

    # Query for the pin with the provided latitude and longitude
    pin = Pin.query.filter_by(user_id=current_user.id, latitude=lat, longitude=lng).first()
    if not pin:
        return jsonify({'success': False, 'message': 'Pin not found'}), 404

    # Retrieve all photos associated with the pin
    photos = Photo.query.filter_by(pin_id=pin.id).all()
    photo_urls = [photo.photo_url for photo in photos]

    # Return pin data along with photo URLs
    return jsonify({
        'success': True,
        'pin': {
            'lat': lat,
            'lng': lng,
            'photos': photo_urls
        }
    }), 200


@views.route('/upload', methods=['POST'])
# @login_required  # Temporarily comment out for debugging if needed
def upload_photo():
    print("upload_photo function started")  # Initial debug print

    # Retrieve latitude and longitude from form data
    lat = request.form.get('lat')
    lng = request.form.get('lng')

    if lat and lng:
        try:
            lat = round(float(lat), 5)
            lng = round(float(lng), 5)
            print(f"Received lat: {lat}, lng: {lng}")  # Print received data
        except ValueError as e:
            print("Error converting lat/lng to float:", e)
            return jsonify({'success': False, 'message': 'Invalid latitude or longitude format'}), 400
    else:
        print("Latitude and longitude are missing")  # Debug missing lat/lng
        return jsonify({'success': False, 'message': 'Latitude and longitude are required'}), 400

    # Query for pin with the provided lat/lng
    pin = Pin.query.filter_by(user_id=current_user.id, latitude=lat, longitude=lng).first()

    # Check for file presence in request
    if 'photo' not in request.files:
        print("No file part in the request")  # Debug missing file part
        return jsonify({'success': False, 'message': 'No file part'}), 400

    file = request.files['photo']
    if file.filename == '':
        print("No selected file")  # Debug empty filename
        return jsonify({'success': False, 'message': 'No selected file'}), 400

    # Get user_id and pin_id
    user_id = request.form.get('user_id', str(current_user.id))
    pin_id = request.form.get('pin_id', str(pin.id))

    # Create a unique directory path for the user and pin
    user_pin_folder = os.path.join(UPLOAD_FOLDER, user_id, pin_id)
    print(f"Creating folder: {user_pin_folder}")
    os.makedirs(user_pin_folder, exist_ok=True)

    # Generate a unique filename
    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{secure_filename(file.filename)}"
    file_path = os.path.join(user_pin_folder, filename)

    print(f"Saving file '{filename}' to folder '{user_pin_folder}'")
    # Save the file
    file.save(file_path)
    new_photo = Photo(pin_id=pin_id, photo_url=file_path)
    db.session.add(new_photo)
    db.session.commit()

    # Fetch all photos for this pin
    photos = Photo.query.filter_by(pin_id=pin.id).all()
    photo_urls = [photo.photo_url for photo in photos]

    return jsonify({
        'success': True,
        'message': 'File uploaded successfully',
        'file_path': file_path,
        'photos': photo_urls
    }), 200
def get_pin():
    # Retrieve latitude and longitude from query parameters
    lat = request.args.get('lat')
    lng = request.args.get('lng')

    if not lat or not lng:
        return jsonify({'success': False, 'message': 'Latitude and longitude are required'}), 400

    try:
        # Convert to float with rounding to match precision
        lat = round(float(lat), 5)
        lng = round(float(lng), 5)
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid latitude or longitude format'}), 400

    # Query for the pin with the provided latitude and longitude
    pin = Pin.query.filter_by(user_id=current_user.id, latitude=lat, longitude=lng).first()
    if not pin:
        return jsonify({'success': False, 'message': 'Pin not found'}), 404

    # Retrieve all photos associated with the pin
    photos = Photo.query.filter_by(pin_id=pin.id).all()
    photo_urls = [photo.photo_url for photo in photos]

    # Return pin data along with photo URLs
    return jsonify({
        'success': True,
        'pin': {
            'lat': lat,
            'lng': lng,
            'photos': photo_urls
        }
    }), 200

@views.route('/delete_photos', methods=['GET'])
@login_required
def delete_photos():
    # Retrieve latitude and longitude from query parameters
    lat = request.args.get('lat')
    lng = request.args.get('lng')

    if not lat or not lng:
        return jsonify({'success': False, 'message': 'Latitude and longitude are required'}), 400

    try:
        # Convert to float with rounding to match precision
        lat = round(float(lat), 5)
        lng = round(float(lng), 5)
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid latitude or longitude format'}), 400

    # Query for the pin with the provided latitude and longitude
    pin = Pin.query.filter_by(user_id=current_user.id, latitude=lat, longitude=lng).first()
    if not pin:
        return jsonify({'success': False, 'message': 'Pin not found'}), 404

    # Retrieve all photos associated with the pin
    photos = Photo.query.filter_by(pin_id=pin.id).all()
    #photo_urls = [photo.photo_url for photo in photos]
    if photos != '':
        for photo in photos:
            db.session.delete(photo)
        db.session.commit()
        return jsonify({'message': 'Photo deleted successfully'})

    return jsonify({'error': 'Photos not found'}), 404