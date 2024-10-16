from . import db
from flask_login import UserMixin
from sqlalchemy.sql import func


# User model corresponding to the User table
class User(db.Model, UserMixin):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(255))
    first_name = db.Column(db.String(150))
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    last_login = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to connect User to Pins
    pins = db.relationship('Pin', backref='user', lazy=True)
    # Relationship to connect User to Administrator (1:1)
    admin = db.relationship('Administrator', uselist=False, backref='user')


# Administrator model corresponding to the Administrator table
class Administrator(db.Model):
    __tablename__ = 'administrator'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)

    # Relationship to connect Administrator to AdminPrivilege
    privileges = db.relationship('AdminPrivilege', backref='administrator', lazy=True)


# Privilege model corresponding to the Privilege table
class Privilege(db.Model):
    __tablename__ = 'privilege'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), unique=True, nullable=False)

    # Relationship to connect Privilege to AdminPrivilege
    admin_privileges = db.relationship('AdminPrivilege', backref='privilege', lazy=True)


# AdminPrivilege model corresponding to the junction table
class AdminPrivilege(db.Model):
    __tablename__ = 'admin_privilege'
    admin_id = db.Column(db.Integer, db.ForeignKey('administrator.id', ondelete='CASCADE'), primary_key=True)
    privilege_id = db.Column(db.Integer, db.ForeignKey('privilege.id', ondelete='CASCADE'), primary_key=True)


# Pin model corresponding to the Pin table
class Pin(db.Model):
    __tablename__ = 'pin'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    latitude = db.Column(db.Numeric(9, 6), nullable=False)
    longitude = db.Column(db.Numeric(9, 6), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    # Relationship to connect Pin to PinDetails (1:1)
    details = db.relationship('PinDetails', uselist=False, backref='pin')
    # Relationship to connect Pin to Photos
    photos = db.relationship('Photo', backref='pin', lazy=True)


# PinDetails model corresponding to the PinDetails table
class PinDetails(db.Model):
    __tablename__ = 'pin_details'
    id = db.Column(db.Integer, db.ForeignKey('pin.id', ondelete='CASCADE'), primary_key=True)
    description = db.Column(db.Text)
    tags = db.Column(db.String(255))
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())


# Photo model corresponding to the Photo table
class Photo(db.Model):
    __tablename__ = 'photo'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    pin_id = db.Column(db.Integer, db.ForeignKey('pin.id', ondelete='CASCADE'), nullable=False)
    photo_url = db.Column(db.String(255), nullable=False)
    uploaded_at = db.Column(db.DateTime(timezone=True), server_default=func.now())


# Note model corresponding to the previous Note table (kept for user notes)
class Note(db.Model):
    __tablename__ = 'note'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    data = db.Column(db.String(10000))
    date = db.Column(db.DateTime(timezone=True), server_default=func.now())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)

'''class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.String(10000))
    date = db.Column(db.DateTime(timezone=True), default=func.now())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True)
    password = db.Column(db.String(150))
    first_name = db.Column(db.String(150))
    notes = db.relationship('Note')

class MarkerPhoto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    image_filename = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))'''
