// ---------------- RIGHT CLICK MENU OPERATIONS -------------------
async function singleRightClickMenuRenameZettel() {
    zettelId = rightClickMenuSelectedFile.dataset.id;
    if (!zettelId) return;
    
    const currentTitle = rightClickMenuSelectedFile.querySelector('.file-name').textContent;
    const newTitle = prompt('Enter new title:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;

    data = await setRenameZettel(zettelId, newTitle);

    if (data.success) {
        rightClickMenuSelectedFile.querySelector('.file-name').textContent = newTitle;
    } else {
        alert('Failed to rename zettel');
    }
    singleRightClickMenu.style.display = 'none';
}

function addFileToFolder(data, is_public = false) {
    const folderContent = document.querySelector('.folder-content');
    const newZettel = document.createElement('div');
    newZettel.className = 'file';
    newZettel.dataset.type = 'file';
    newZettel.dataset.id = data.id;
    if (is_public) {
        newZettel.innerHTML = `
            <span class="file-icon">📄</span>
            <span class="file-name">${data.title}</span>
        `;
    } else {
        newZettel.innerHTML = `
            <span class="file-icon">🔒</span>
            <span class="file-name">${data.title}</span>
        `;
    }
    folderContent.insertBefore(newZettel, folderContent.firstChild);
}

async function singleRightClickMenuDuplicateZettel() {
    zettelId = rightClickMenuSelectedFile.dataset.id;
    if (!zettelId) return;
    data = await setDuplicateZettel(zettelId);
    if (data.success) {
        addFileToFolder(data, rightClickMenuSelectedFile.dataset.is_public);
        singleRightClickMenu.style.display = 'none';
    } else {
        alert('Failed to duplicate zettel');
    }
    singleRightClickMenu.style.display = 'none';
}

async function singleRightClickMenuDeleteZettel() {
    zettelId = rightClickMenuSelectedFile.dataset.id;
    if (!confirm('Are you sure you want to delete zettel titled "' + rightClickMenuSelectedFile.querySelector('.file-name').textContent + '"?')) return;

    data = await setDeleteZettel(zettelId);
    if (data.success) {
        rightClickMenuSelectedFile.remove();
    } else {
        alert('Failed to delete zettel');
    }
    singleRightClickMenu.style.display = 'none';
}   

async function singleRightClickMenuChangePrivacySettings() {
    zettelId = rightClickMenuSelectedFile.dataset.id;
    button = document.getElementById('singleRightClickMenu_privacy_settings_button').textContent;
    console.log(button);
    if (button == 'Make Private') {
        data = await makePrivate(zettelId);
        if (data.success) {
            rightClickMenuSelectedFile.querySelector('.file-icon').textContent = '🔒';
        } else {
            alert('Failed to make zettel private');
        }
    } else {
        data = await makePublic(zettelId);
        if (data.success) {
            rightClickMenuSelectedFile.querySelector('.file-icon').textContent = '📄';
        } else {
            alert('Failed to make zettel public');
        }
    }
    singleRightClickMenu.style.display = 'none';
}

async function multipleRightClickMenuDeleteZettel() {
    if (!confirm('Are you sure you want to delete ' + selectedFiles.length + ' zettels?')) return;
    selectedFiles.forEach(async file => {
        data = await setDeleteZettel(file.dataset.id);
        if (data.success) {
            file.remove();
        } else {
            alert('Failed to delete zettel');
        }
        file.remove();
    });
    multipleRightClickMenu.style.display = 'none';

}

async function multipleRightClickMenuMakePublic() {
    selectedFiles.forEach(async file => {
        data = await makePublic(file.dataset.id);
        if (data.success) {
            file.querySelector('.file-icon').textContent = '📄';
        } else {
            alert('Failed to make zettel public');
        }
    });
    multipleRightClickMenu.style.display = 'none';
}

async function multipleRightClickMenuMakePrivate() {
    selectedFiles.forEach(async file => {
        data = await makePrivate(file.dataset.id);
        if (data.success) {
            file.querySelector('.file-icon').textContent = '🔒';
        } else {
            alert('Failed to make zettel private');
        }
    });
    multipleRightClickMenu.style.display = 'none';
}


// ---------------- FILE MANAGER TOP BAR OPERATIONS -------------------
function updateZettel(content, zettelId) {
    if (!zettelId) return;
    data = setUpdateZettel(content, zettelId);
    if (data.success) {
        location.reload();
    } else {
        alert('Failed to save zettel content');
    }
}


async function CreateZettel(){
    data = await setCreateZettel();
    if (data.success) {
        addFileToFolder(data, false);
    } else {
        alert('Failed to create zettel');
    }
}






async function loadZettel(zettelId, markdownViewer, markdownEditor) {
    if (!zettelId) return;
    data = await getZettelContent(zettelId);
    if (data.success) {
        document.getElementById('markdown-line').style.display = 'block';
        document.getElementById('markdown-title').textContent = capitalizeWords(data.title);
        document.getElementById('markdown-created').textContent = `Created: ${data.created}`;
        document.getElementById('markdown-updated').textContent = `Updated: ${data.updated}`;
        document.getElementById('markdown-author').textContent = data.author;
        markdownViewer.innerHTML = marked.parse(data.contentRaw);
        markdownEditor.value = data.contentRaw;
    } else {
        alert('Failed to load zettel content');
    }
}

// ---------------- RESIZER -------------------
let isResizing = false;
let currentResizer;
let prevColumn;
let nextColumn;
let prevColumnWidth;
let nextColumnWidth;
let startX;



function initResize(e) {
    isResizing = true;
    currentResizer = e.target;
    prevColumn = currentResizer.previousElementSibling;
    nextColumn = currentResizer.nextElementSibling;
    startX = e.pageX;
    

    prevColumnWidth = prevColumn.offsetWidth;
    nextColumnWidth = nextColumn.offsetWidth;

    console.log(prevColumnWidth);
    console.log(nextColumnWidth);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
}

function resize(e) {
    if (!isResizing) return;
    
    const diff = e.pageX - startX;



    // Calculate new widths
    const newPrevWidth = prevColumnWidth + diff;
    const newNextWidth = nextColumnWidth - diff;
    
    // Set minimum width (100px)
    if (newPrevWidth >= 10 && newNextWidth >= 10) {
        prevColumn.style.width = newPrevWidth + 'px';
        nextColumn.style.width = newNextWidth + 'px';
    }
}

function stopResize() {
    const columns = document.querySelectorAll('.column');
    const container = document.querySelector('.zettelkasten-container');
    isResizing = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
    // Save the new widths to localStorage
    columns.forEach(column => {
        if (column.style.width.includes('px')) {
            localStorage.setItem(`column-width-${column.id}`, column.style.width.replace('px', '') / container.offsetWidth * 100 );
        } else {
            localStorage.setItem(`column-width-${column.id}`, column.style.width);
        }
    });
}

// ---------------- HELPERS -------------------
function capitalizeWords(str) {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  
function getCSRFToken() {
    let cookieValue = null;
    const name = 'csrftoken';
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}