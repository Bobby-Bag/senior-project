import sqlalchemy
from flask import Blueprint, render_template, request, flash, jsonify, url_for
from flask_cors import CORS
from flask_login import login_required, current_user
from .models import Pin, Photo, User
from . import db
import os
from flask import send_from_directory
from werkzeug.utils import secure_filename, redirect
from datetime import datetime
import json
import logging

logging.basicConfig(level=logging.DEBUG)

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


@views.route('/get_pins', methods=['GET'])
@login_required
def get_pins():
    logging.debug('Fetching pins for user: %s', current_user.id)
    user_id = current_user.id
    pins = Pin.query.filter_by(user_id=user_id).all()
    pins_data = [{'lat': pin.latitude, 'lng': pin.longitude} for pin in pins]
    logging.debug('Pins data: %s', pins_data)
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
        try:
            # First delete all photos associated with this pin
            photos = Photo.query.filter_by(pin_id=pin.id).all()
            for photo in photos:
                db.session.delete(photo)

            # Now delete the pin
            db.session.delete(pin)
            db.session.commit()
            return jsonify({'message': 'Pin and associated photos deleted successfully'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    else:
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

    # Delete the pin if there are no photos
    if not photo_urls:
        db.session.delete(pin)
        db.session.commit()
        return jsonify({
            'success': False,
            'message': 'Pin had no photos and was deleted.'
        }), 200

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
@login_required
def upload_photo():
    lat = request.form.get('lat')
    lng = request.form.get('lng')

    if lat and lng:
        try:
            lat = round(float(lat), 5)
            lng = round(float(lng), 5)
        except ValueError as e:
            return jsonify({'success': False, 'message': 'Invalid latitude or longitude format'}), 400
    else:
        return jsonify({'success': False, 'message': 'Latitude and longitude are required'}), 400

    pin = Pin.query.filter_by(user_id=current_user.id, latitude=lat, longitude=lng).first()

    if 'photo' not in request.files:
        return jsonify({'success': False, 'message': 'No file part'}), 400

    file = request.files['photo']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file'}), 400

    user_id = str(current_user.id)
    pin_id = str(pin.id)

    user_pin_folder = os.path.join(UPLOAD_FOLDER, user_id, pin_id)
    os.makedirs(user_pin_folder, exist_ok=True)

    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{secure_filename(file.filename)}"
    file_path = os.path.join(user_pin_folder, filename)

    file.save(file_path)

    new_photo = Photo(pin_id=pin.id, photo_url=file_path)
    db.session.add(new_photo)
    db.session.commit()

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
    lat = request.args.get('lat')
    lng = request.args.get('lng')

    if not lat or not lng:
        return jsonify({'success': False, 'message': 'Latitude and longitude are required'}), 400

    try:
        lat = round(float(lat), 5)
        lng = round(float(lng), 5)
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid latitude or longitude format'}), 400

    pin = Pin.query.filter_by(user_id=current_user.id, latitude=lat, longitude=lng).first()
    if not pin:
        return jsonify({'success': False, 'message': 'Pin not found'}), 404

    try:
        # Start a transaction
        with db.session.begin_nested():
            # Retrieve all photos associated with the pin
            photos = Photo.query.filter_by(pin_id=pin.id).all()

            # Delete the photos
            if photos:
                for photo in photos:
                    db.session.delete(photo)

            # Commit photo deletions
            db.session.commit()

            # Check if the pin is empty and delete it if it has no photos left
            empty_pin = Photo.query.filter_by(pin_id=pin.id).count() == 0
            if empty_pin:
                db.session.delete(pin)
                db.session.commit()
                return jsonify({'message': 'Photos and empty pin deleted successfully'}), 200

            return jsonify({'message': 'Photos deleted successfully'}), 200

    except sqlalchemy.orm.exc.ObjectDeletedError:
        db.session.rollback()
        return jsonify({'error': 'Instance has been deleted or is not present'}), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'Photos not found'}), 404

# Updated display_users route to fetch user's first_name and id
@views.route('/users')
def display_users():
    users = User.query.with_entities(User.first_name, User.id).all()  # Fetch all users' first name and id
    return render_template("users.html", users=users)  # Pass users to the template


# Define a constant for the uploads directory
UPLOADS_DIRECTORY = '/uploads'


def construct_photo_url(photo_url):
    # Normalize photo URL to ensure it starts with UPLOADS_DIRECTORY
    if photo_url.startswith(UPLOADS_DIRECTORY):
        return photo_url
    elif photo_url.startswith('/website/uploads'):
        return photo_url.replace('/website/uploads', UPLOADS_DIRECTORY)
    else:
        return f'{UPLOADS_DIRECTORY}/{photo_url}'


@views.route('/user/<int:user_id>/pins')
@login_required
def user_pins(user_id):
    if user_id == current_user.id:
        flash('You cannot view your own pins here.', category='error')
        return redirect(url_for('views.home'))

    user = User.query.get(user_id)
    if not user:
        flash('User not found', category='error')
        return redirect(url_for('views.home'))

    pins = Pin.query.filter_by(user_id=user_id).all()
    pin_locations = []
    for pin in pins:
        photos = Photo.query.filter_by(pin_id=pin.id).all()
        # Normalize photo URLs
        photo_urls = [construct_photo_url(photo.photo_url) for photo in photos]
        pin_data = {'lat': pin.latitude, 'lng': pin.longitude, 'photos': photo_urls}
        pin_locations.append(pin_data)

    return render_template('user_pins.html', user=user, pins=pin_locations)
