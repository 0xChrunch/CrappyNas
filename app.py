import os
import sys
import json
import threading
import time
import socket
import subprocess
import shutil
import io
import zipfile
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, flash, send_file, jsonify

#Flask app initializing
app = Flask(__name__)

#Load custom configurations from config.json
try:
    with open('config.json') as config_file:
        config = json.load(config_file)
except FileNotFoundError:
    print("Configuration file not found. Please run the installation script.")
    sys.exit(1)
#secret key, used by flask to sign the session cookies
app.secret_key = config.get('SECRET_KEY', 'default_secret_key')

#this sets the path to the shared file folder in wich all of your files/folders are going to be stored
UPLOAD_FOLDER = config.get('UPLOAD_FOLDER', os.path.join(os.getcwd(), 'shared_files'))
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

#Password section here, a password.txt file will be created after the first login config
def is_password_set():
    return os.path.exists('password.txt')
#For checking everytime you login
def get_saved_password():
    with open('password.txt', 'r') as f:
        return f.read()

#"To be password, or not to be password that is the question"
#said William Shakespeare while setting up crappynas
#if the password is not set, the user is redirected to the page for setting up one, otherwhise you can be authenticated
@app.route('/', methods=['GET', 'POST'])
def login():
    if not is_password_set():
        if request.method == 'POST':
            password = request.form['password']
            with open('password.txt', 'w') as f:
                f.write(password)
            session['logged_in'] = True
            return redirect(url_for('home'))
        return render_template('set_password.html')
    else:
        if request.method == 'POST':
            password = request.form['password']
            if password == get_saved_password():
                session['logged_in'] = True
                return redirect(url_for('home'))
            else:
                error = 'Incorrect password. Please try again.'
                return render_template('login.html', error=error)
        return render_template('login.html')

#if you are not logged in this will bring you to the login page
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' in session and session['logged_in']:
            return f(*args, **kwargs)
        else:
            return redirect(url_for('login'))
    return decorated_function

#gather IP address of the host
def get_local_ip():
    
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

# Home section
@app.route('/home', defaults={'path': ''})
@app.route('/home/<path:path>')
@login_required
def home(path):
    current_path = os.path.join(app.config['UPLOAD_FOLDER'], path)
    if not os.path.exists(current_path):
        return "Invalid path.", 404

    #all items in the directory
    items = os.listdir(current_path)
    files = []
    directories = []
    for item in items:
        item_path = os.path.join(current_path, item)
        if os.path.isdir(item_path):
            directories.append(item)
        else:
            files.append(item)

    #parent path
    if path == '':
        parent_path = ''
    else:
        parent_path = os.path.dirname(path.rstrip('/'))

    #here it loads the home HTML file and gets the IP
    return render_template('home.html',
                           files=files,
                           directories=directories,
                           current_path=path,
                           parent_path=parent_path,
                           ip_address=get_local_ip())

# here it handle download & upload functions

#DOWNLOAD
@app.route('/download/<path:filepath>')
@login_required
def download(filepath):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filepath, as_attachment=True)

#UPLOAD
@app.route('/upload', methods=['POST'])
@login_required
def upload():
    path = request.form.get('path', '')
    current_path = os.path.join(app.config['UPLOAD_FOLDER'], path)
    if 'file' not in request.files:
        return redirect(url_for('home', path=path))
    files = request.files.getlist('file')
    for file in files:
        if file.filename == '':
            continue
        file.save(os.path.join(current_path, file.filename))
    return redirect(url_for('home', path=path))

#CREATING A FOLDER
@app.route('/create_folder', methods=['POST'])
@login_required
def create_folder():
    path = request.form.get('path', '')
    folder_name = request.form.get('folder_name', '')
    current_path = os.path.join(app.config['UPLOAD_FOLDER'], path)
    new_folder_path = os.path.join(current_path, folder_name)
    if not os.path.exists(new_folder_path):
        os.makedirs(new_folder_path)
        flash('Folder created successfully.')
    else:
        flash('Folder already exists.')
    return redirect(url_for('home', path=path))

#function for folder delete
@app.route('/delete_file', methods=['POST'])
@login_required
def delete_file():
    data = request.get_json()
    path = data.get('path', '')
    filename = data.get('filename', '')
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], path, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        os.remove(file_path)
        return jsonify({'status': 'success'})
    else:
        return jsonify({'status': 'file not found'}), 404

#function for folder delete
@app.route('/delete_folder', methods=['POST'])
@login_required
def delete_folder():
    data = request.get_json()
    path = data.get('path', '')
    foldername = data.get('foldername', '')
    folder_path = os.path.join(app.config['UPLOAD_FOLDER'], path, foldername)
    if os.path.exists(folder_path) and os.path.isdir(folder_path):
        shutil.rmtree(folder_path)
        return jsonify({'status': 'success'})
    else:
        return jsonify({'status': 'folder not found'}), 404

#function for folders delete with checkbox selection
@app.route('/delete_selected', methods=['POST'])
@login_required
def delete_selected():
    data = request.get_json()
    path = data.get('path', '')
    selected_files = data.get('selected_files', [])
    current_path = os.path.join(app.config['UPLOAD_FOLDER'], path)

    for filename in selected_files:
        file_path = os.path.join(current_path, filename)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            os.remove(file_path)
    return jsonify({'status': 'success'})

#function for files delete with checkbox selection
@app.route('/download_selected', methods=['POST'])
@login_required
#only for multiple files
def download_selected():
    data = request.get_json()
    path = data.get('path', '')
    selected_files = data.get('selected_files', [])
    current_path = os.path.join(app.config['UPLOAD_FOLDER'], path)

    #here the .zip file is created
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w') as zf:
        for filename in selected_files:
            file_path = os.path.join(current_path, filename)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                zf.write(file_path, arcname=filename)
    memory_file.seek(0)

    #then shipped for download
    return send_file(
        memory_file,
        mimetype='application/zip',
        as_attachment=True,
        download_name='files.zip'
    )

#system stats gathering using psutil library
@app.route('/system_stats')
@login_required
def system_stats():
    import psutil
    # CPU Temp
    temps = psutil.sensors_temperatures()
    cpu_temp = 'N/A'
    for name, entries in temps.items():
        for entry in entries:
            if entry.label in ('Package id 0', 'Core 0', ''):
                cpu_temp = entry.current
                break
        if cpu_temp != 'N/A':
            break

    if cpu_temp != 'N/A':
        cpu_temp = round(cpu_temp, 1)

    # RAM %
    ram_usage = psutil.virtual_memory().percent

    # Disk %
    disk_usage = psutil.disk_usage('/').percent

    #formatting the stats in json
    return {
        'cpu_temp': cpu_temp,
        'ram_usage': ram_usage,
        'disk_usage': disk_usage
    }

# Shutdown route
@app.route('/shutdown')
@login_required
def shutdown():
    def shutdown_system():
        time.sleep(2)  # without this you can't see the beautiful running pepe while shutting down
        subprocess.call(['sudo', 'shutdown', 'now'])
    threading.Thread(target=shutdown_system).start()
    return render_template('shutdown.html')

# Reboot route
@app.route('/reboot')
@login_required
def reboot():
    def reboot_system():
        time.sleep(2) # without this you can't see the beautiful running pepe while rebooting
        subprocess.call(['sudo', 'reboot'])
    threading.Thread(target=reboot_system).start()
    return render_template('reboot.html')

#matching filetype with corresponding images
#if i'm not lazy i'll update with more images :)
def get_icon(filename):
    if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
        return url_for('static', filename='image_icon.png')
    elif filename.lower().endswith(('.mp4', '.avi', '.mkv', '.mov')):
        return url_for('static', filename='video_icon.png')
    elif filename.lower().endswith(('.txt', '.doc', '.docx', '.pdf')):
        return url_for('static', filename='text_icon.png')
    else:
        return url_for('static', filename='file_icon.png')

app.jinja_env.globals.update(get_icon=get_icon)

app.config['SESSION_TYPE'] = 'filesystem'

#run the application
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
