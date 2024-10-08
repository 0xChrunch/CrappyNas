//This is for the system stats
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

// the system stats are updated every 5 seconds
setInterval(updateSystemStats, 5000);
updateSystemStats();

//for the drag & drop function
//inizialing an empty array for the files to upload
let dropArea = document.getElementById('drop-area');
let filesToUpload = [];

//this is essential to let the browser know the page is listening for a file drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});
//without this when you drop a file, it will be opened in the browser
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

//style part to highlight and dehighlight the box when there is a file above
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
});

//file release control logic
dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;
    handleFiles(files);
}
document.querySelector('input[type="file"]').addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

//display the selected files in the box, so you know what you are uploading
function handleFiles(files) {
    files = [...files];
    filesToUpload.push(...files);
    files.forEach(previewFile);
}

function previewFile(file) {
    let gallery = document.getElementById('gallery');
    let div = document.createElement('div');
    div.classList.add('preview');
    div.innerText = file.name;
    gallery.appendChild(div);
}

//upload logic, executed when pressing the upload button
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
//file delete logic (multiple files selected)
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

//file delete logic (single file)
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
        //http post request 
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

//Delete folder button
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

//to get selected files you need checkboxes
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
