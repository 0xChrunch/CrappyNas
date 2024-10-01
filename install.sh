#!/bin/bash

echo "Starting installation..."

# Update package lists
sudo apt update

# Install necessary packages
sudo apt install -y python3 python3-venv python3-pip git

# Prompt for configuration parameters
read -p "Enter the path for shared files directory (default: ~/shared_files): " SHARED_DIR
SHARED_DIR=${SHARED_DIR:-~/shared_files}
SHARED_DIR=$(eval echo $SHARED_DIR)

read -p "Enter the secret key for Flask session (leave blank to generate one): " SECRET_KEY
if [ -z "$SECRET_KEY" ]; then
    SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(16))')
fi

# Create shared files directory
mkdir -p "$SHARED_DIR"

# Save configurations to config.json
cat > config.json <<EOF
{
  "UPLOAD_FOLDER": "$SHARED_DIR",
  "SECRET_KEY": "$SECRET_KEY"
}
EOF

# Set up Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install required Python packages
pip install -r requirements.txt

deactivate

# Create systemd service file
SERVICE_FILE="/etc/systemd/system/nasapp.service"
sudo bash -c "cat > $SERVICE_FILE" <<EOL
[Unit]
Description=NAS Flask Application
After=network.target

[Service]
User=$USER
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/venv/bin
ExecStart=$(pwd)/venv/bin/python app.py

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable and start the service
sudo systemctl enable nasapp.service
sudo systemctl start nasapp.service

echo "Installation complete. The NAS application is running and set to start on boot."
echo "You can access it at http://$(hostname -I | awk '{print $1}'):5000"
