from flask import Blueprint, render_template, request, flash, jsonify
from flask_cors import CORS
from flask_login import login_required, current_user
from .models import Pin
from . import db
import json

views = Blueprint('views', __name__)


@views.route('/', methods=['GET', 'POST'])
@login_required
def home():

    return render_template("home.html", user=current_user)


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

# views is a file where users can go to. so example login, homepage. Anything that
# the user can go to.