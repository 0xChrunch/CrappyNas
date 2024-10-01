// Function to update system stats
function updateSystemStats() {
    fetch('/system_stats')
        .then(response => response.json())
        .then(data => {
            document.getElementById('cpu-temp').innerText = data.cpu_temp + '°C';
            document.getElementById('ram-usage').innerText = data.ram_usage + '%';
            document.getElementById('disk-usage').innerText = data.disk_usage + '%';
        })
        .catch(error => console.error('Error fetching system stats:', error));
}

// Initial and periodic update of system stats
setInterval(updateSystemStats, 5000);
updateSystemStats();

// Variables for drag-and-drop functionality
let dropArea = document.getElementById('drop-area');
let filesToUpload = [];

// Prevent default behaviors for drag-and-drop events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop area when files are dragged over
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
});

// Handle files dropped into the drop area
dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;
    handleFiles(files);
}

// Handle files selected via the file input
document.querySelector('input[type="file"]').addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// Process and display selected files
function handleFiles(files) {
    files = [...files];
    filesToUpload.push(...files);
    files.forEach(previewFile);
}

// Display selected files in the gallery
function previewFile(file) {
    let gallery = document.getElementById('gallery');
    let div = document.createElement('div');
    div.classList.add('preview');
    div.innerText = file.name;
    gallery.appendChild(div);
}

// Upload files when the upload button is clicked
document.getElementById('upload-button').addEventListener('click', () => {
    if (filesToUpload.length === 0) {
        alert('No files selected');
        return;
    }
    let url = '/upload';
    let formData = new FormData();
    filesToUpload.forEach(file => {
        formData.append('file', file);
    });
    formData.append('path', currentPath);

    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(() => {
        window.location.reload();
    })
    .catch(() => {
        alert('Upload failed');
    });

    filesToUpload = [];
    document.getElementById('gallery').innerHTML = '';
});

// Handle multi-file actions (delete and download)
document.getElementById('download-selected').addEventListener('click', () => {
    let selectedFiles = getSelectedFiles();
    if (selectedFiles.length === 0) {
        alert('No files selected');
        return;
    }
    let url = '/download_selected';
    let data = {
        path: currentPath,
        selected_files: selectedFiles
    };

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.blob())
    .then(blob => {
        let link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = 'files.zip';
        link.click();
    })
    .catch(() => {
        alert('Download failed');
    });
});

document.getElementById('delete-selected').addEventListener('click', () => {
    let selectedFiles = getSelectedFiles();
    if (selectedFiles.length === 0) {
        alert('No files selected');
        return;
    }
    if (!confirm('Are you sure you want to delete the selected files?')) {
        return;
    }
    let url = '/delete_selected';
    let data = {
        path: currentPath,
        selected_files: selectedFiles
    };

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(() => {
        window.location.reload();
    })
    .catch(() => {
        alert('Deletion failed');
    });
});

// Single file delete button
document.querySelectorAll('.delete-button').forEach(button => {
    button.addEventListener('click', (e) => {
        let filename = e.currentTarget.getAttribute('data-filename');
        if (!confirm(`Are you sure you want to delete the file "${filename}"?`)) {
            return;
        }
        let url = '/delete_file';
        let data = {
            path: currentPath,
            filename: filename
        };

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(() => {
            window.location.reload();
        })
        .catch(() => {
            alert('Deletion failed');
        });
    });
});

// Delete folder button
document.querySelectorAll('.delete-folder-button').forEach(button => {
    button.addEventListener('click', (e) => {
        let foldername = e.currentTarget.getAttribute('data-foldername');
        if (!confirm(`Are you sure you want to delete the folder "${foldername}"?`)) {
            return;
        }
        let url = '/delete_folder';
        let data = {
            path: currentPath,
            foldername: foldername
        };

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(() => {
            window.location.reload();
        })
        .catch(() => {
            alert('Deletion failed');
        });
    });
});

// Function to get selected files
function getSelectedFiles() {
    let checkboxes = document.querySelectorAll('.select-file-checkbox');
    let selectedFiles = [];
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedFiles.push(checkbox.value);
        }
    });
    return selectedFiles;
}
