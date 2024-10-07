#!/bin/bash
echo "Starting uninstallation of CrappyNas..."

if [ ! -f "app.py" ]; then
    echo "Please run this script from the CrappyNas installation directory."
    exit 1
fi

echo "Stopping the CrappyNas service..."
sudo systemctl stop crappynas.service

echo "Disabling the CrappyNas service..."
sudo systemctl disable crappynas.service

echo "Removing the systemd service file..."
sudo rm -f /etc/systemd/system/crappynas.service
sudo systemctl daemon-reload

echo "crying a little bit..."
sleep 1

SHARED_DIR=$(python3 -c "import json; print(json.load(open('config.json')).get('UPLOAD_FOLDER', '~/shared_files'))")
SHARED_DIR=$(eval echo $SHARED_DIR)

read -p "Do you want to remove the shared files directory ($SHARED_DIR)? (y/N): " remove_shared_dir

if [[ "$remove_shared_dir" =~ ^[Yy]$ ]]; then
    read -p "Are you sure? all the files will be lost (y/N): " confirm_delete
    if [[ "$confirm_delete" =~ ^[Yy]$ ]]; then
        echo "Deleting shared files directory..."
        rm -rf "$SHARED_DIR"
    else
        echo "The program will be uninstalled but you can still access all the files in ($SHARED_DIR)"
    fi
else
    echo "The program will be uninstalled but you can still access all the files in ($SHARED_DIR)"
fi

echo "Removing the virtual environment..."
rm -rf venv

echo "Removing configuration files..."
rm -f config.json password.txt

echo "All files have been removed, you can now remove the directory you cloned with GitHub"

echo "CrappyNas has been successfully uninstalled."
