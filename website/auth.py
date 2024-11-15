# not needed
from flask import Blueprint, render_template, request, flash, redirect, url_for
from .models import User
from werkzeug.security import generate_password_hash, check_password_hash
from . import db   ##means from __init__.py import db
from flask_login import login_user, login_required, logout_user, current_user


auth = Blueprint('auth', __name__)


@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()
        if user:
            if check_password_hash(user.password, password):
                flash('Logged in successfully!', category='success')
                login_user(user, remember=True)
                return redirect(url_for('views.home'))
            else:
                flash('Incorrect password, try again.', category='error')
        else:
            flash('Email does not exist.', category='error')

    return render_template("login.html", user=current_user)


@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login'))


@auth.route('/sign-up', methods=['GET', 'POST'])
def sign_up():
    if request.method == 'POST':
        email = request.form.get('email')
        first_name = request.form.get('firstName')
        password1 = request.form.get('password1')
        password2 = request.form.get('password2')

        user = User.query.filter_by(email=email).first()
        if user:
            flash('Email already exists.', category='error')
        elif len(email) < 4:
            flash('Email must be greater than 3 characters.', category='error')
        elif len(first_name) < 2:
            flash('First name must be greater than 1 character.', category='error')
        elif password1 != password2:
            flash('Passwords don\'t match.', category='error')
        elif len(password1) < 7:
            flash('Password must be at least 7 characters.', category='error')
        else:
            new_user = User(email=email, first_name=first_name, password=generate_password_hash(
                password1))
            db.session.add(new_user)
            db.session.commit()
            login_user(new_user, remember=True)
            flash('Account created!', category='success')
            return redirect(url_for('views.home'))

    return render_template("sign_up.html", user=current_user)

@auth.route('/Users')
def display_users():
    users = User.query.with_entities(User.first_name, User.id).all()  # Fetch all users' first name and id
    return render_template("users.html", users=users)  # Pass users to the template


@auth.route('/User/<int:user_id>')
def view_user(user_id):
    user = User.query.get(user_id)
    if user is None:
        flash('User not found', category='error')
        return redirect(url_for('auth.display_users'))
    return render_template("view_user.html", user=user)


@auth.route('/account', methods=['GET', 'POST'])
@login_required
def account():
    if request.method == 'POST':
        email = request.form.get('email')
        first_name = request.form.get('first_name')

        password1 = request.form.get('password1')
        password2 = request.form.get('password2')

        user = User.query.filter_by(email=email).first()
        if user and user.id != current_user.id:
            flash('Email already exists.', category='error')
        elif len(email) < 4:
            flash('Email must be greater than 3 characters.', category='error')
        elif len(first_name) < 2:
            flash('First name must be greater than 1 character.', category='error')
        elif password1 and password1 != password2:
            flash('Passwords do not match.', category='error')
        elif password1 and len(password1) < 7:
            flash('Password must be at least 7 characters.', category='error')
        else:
            current_user.email = email
            current_user.first_name = first_name
            if password1:
                current_user.password = generate_password_hash(password1)
            db.session.commit()
            flash('Account updated!', category='success')
            return redirect(url_for('auth.account'))

    return render_template("account.html", user=current_user)





@auth.route('/delete_account', methods=['POST'])
@login_required
def delete_account():
    try:
        user = User.query.get(current_user.id)
        if not user:
            flash('User does not exist.', category='error')
            return redirect(url_for('auth.account'))

        # Add any other checks needed before deleting the user
        db.session.delete(user)
        db.session.commit()

        # Logout the user after deleting the account
        logout_user()
        flash('Your account has been deleted.', category='success')
        return redirect(url_for('auth.login'))

    except Exception as e:
        db.session.rollback()
        flash(f'An error occurred while deleting the account: {str(e)}', category='error')
        return redirect(url_for('auth.account'))


@auth.route('/update_notifications', methods=['POST'])
@login_required
def update_notifications():
    email_notifications = 'email_notifications' in request.form
    current_user.email_notifications = email_notifications
    db.session.commit()
    flash('Notification settings updated!', category='success')
    return redirect(url_for('auth.account'))
