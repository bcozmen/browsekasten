//resize functionality
document.addEventListener('DOMContentLoaded', function() {
    const resizers = document.querySelectorAll('.resizer');
    const columns = document.querySelectorAll('.column');
    
    // Load saved widths from localStorage
    columns.forEach(column => {
        const savedWidth = localStorage.getItem(`column-width-${column.id}`);
        if (savedWidth) {
            column.style.width = savedWidth;
        }
    });
    
    let isResizing = false;
    let currentResizer;
    let prevColumn;
    let nextColumn;
    let prevColumnWidth;
    let nextColumnWidth;
    let startX;

    resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', initResize);
    });

    function initResize(e) {
        isResizing = true;
        currentResizer = e.target;
        prevColumn = currentResizer.previousElementSibling;
        nextColumn = currentResizer.nextElementSibling;
        startX = e.pageX;

        prevColumnWidth = prevColumn.offsetWidth;
        nextColumnWidth = nextColumn.offsetWidth;

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
        if (newPrevWidth >= 100 && newNextWidth >= 100) {
            prevColumn.style.width = newPrevWidth + 'px';
            nextColumn.style.width = newNextWidth + 'px';
        }
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);

        // Save the new widths to localStorage
        columns.forEach(column => {
            localStorage.setItem(`column-width-${column.id}`, column.style.width);
        });
    }
});

const fileManager = document.querySelector('.file-manager');
let selectedItem = null;

let selectedZettelId = null;

fileManager.addEventListener('click', function(e) {
    // Find the closest clickable element (folder-header or document)
    const clickable = e.target.closest('.folder-header, .document');
    if (!clickable) return;

    // Remove selected class from previously selected item
    if (selectedItem) {
        selectedItem.classList.remove('selected');
    }

    // Add selected class to clicked item
    clickable.classList.add('selected');
    selectedItem = clickable;

    // Get the type and id of the selected item
    const type = clickable.dataset.type;
    const id = clickable.dataset.id;

    // Dispatch a custom event with the selected item's data
    const event = new CustomEvent('itemSelected', {
        detail: {
            type: type,
            id: id,
            element: clickable
        }
    });
    fileManager.dispatchEvent(event);
});

let currentZettelId = null;
//load zettel content when item is selected
document.querySelector('.file-manager').addEventListener('itemSelected', function(e) {
    if (e.detail.type === 'document') {
        loadZettelContent(e.detail.id);
        currentZettelId = e.detail.id;
    }
}); 

const markdownInput = document.getElementById('markdown-input');
const preview = document.getElementById('zettel-content');
markdownInput.addEventListener('input', () => {
    preview.innerHTML = marked.parse(markdownInput.value);

    //when Input automatically save zettel content
    if (currentZettelId) {
        saveZettelContent();
    }
});

document.querySelector('.file-manager').addEventListener('contextmenu', function(e) {
    e.preventDefault();
    const clickable = e.target.closest('.folder-content, .document');
    if (!clickable) return;
    const type = clickable.dataset.type;
    const id = clickable.dataset.id;

    customMenu.style.display = 'block';
    customMenu.style.left = e.clientX + 'px';
    customMenu.style.top = e.clientY + 'px';
});

//load zettel content
function loadZettelContent(zettelId) {
    fetch(`/zettelkasten/zettel/${zettelId}/content/`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('zettel-title').textContent = data.title;
            document.getElementById('zettel-created').textContent = `Created: ${data.created}`;
            document.getElementById('zettel-updated').textContent = `Updated: ${data.updated}`;
            document.getElementById('zettel-content').innerHTML = data.content;
            document.getElementById('zettel-author').textContent = data.author;

            document.getElementById('markdown-input').value = data.content_raw;
            const tagsContainer = document.getElementById('zettel-tags');
            tagsContainer.innerHTML = '';
            data.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'tag';
                tagSpan.textContent = tag;
                tagsContainer.appendChild(tagSpan);
            });
            
            document.getElementById('zettel-content').innerHTML = marked.parse(data.content);
        })
        .catch(error => console.error('Error loading Zettel content:', error));
}

function getCookie(name) {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(name + '='))
        ?.split('=')[1];
    return cookieValue;
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

function addEmptyZettel(){
    fetch('/zettelkasten/zettel/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ title: 'New Zettel' })
    })
    location.reload(); 
}

function saveZettelContent() {
    const markdown = document.getElementById('markdown-input').value;
    fetch(`/zettelkasten/zettel/${currentZettelId}/update/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },    
        body: JSON.stringify({ content: markdown })
    })
    
}

document.addEventListener('contextmenu', function(e) {
    const documentElement = e.target.closest('.document');
    if (documentElement) {
        e.preventDefault();
        selectedZettelId = documentElement.dataset.id;
        
        const menu = document.getElementById('customMenu');
        menu.style.display = 'block';
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
    }
});

// Close context menu when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('#customMenu')) {
        document.getElementById('customMenu').style.display = 'none';
    }
});

// File operations
async function renameZettel() {
    if (!selectedZettelId) return;
    
    const documentElement = document.querySelector(`.document[data-id="${selectedZettelId}"]`);
    const currentTitle = documentElement.querySelector('.document-name').textContent;
    const currentTitleWithoutMd = currentTitle.replace('.md', '');
    const newTitle = prompt('Enter new title:', currentTitleWithoutMd);
    if (!newTitle || newTitle === currentTitleWithoutMd) return;
    
    try {
        const response = await fetch(`/zettelkasten/zettel/${selectedZettelId}/rename/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ title: newTitle })
        });
        
        if (response.ok) {
            documentElement.querySelector('.document-name').textContent = newTitle;
        } else {
            alert('Failed to rename zettel');
        }
    } catch (error) {
        console.error('Error renaming zettel:', error);
        alert('Error renaming zettel');
    }
    
    document.getElementById('customMenu').style.display = 'none';
    location.reload();
}

async function duplicateZettel() {
    if (!selectedZettelId) return;
    
    try {
        const response = await fetch(`/zettelkasten/zettel/${selectedZettelId}/duplicate/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Add the new zettel to the UI
            const folderContent = document.querySelector('.folder-content');
            const newZettel = document.createElement('div');
            newZettel.className = 'document';
            newZettel.dataset.type = 'document';
            newZettel.dataset.id = data.id;
            newZettel.innerHTML = `
                <span class="document-icon">📄</span>
                <span class="document-name">${data.title}</span>
            `;
            folderContent.insertBefore(newZettel, document.getElementById('customMenu'));
        } else {
            alert('Failed to duplicate zettel');
        }
    } catch (error) {
        console.error('Error duplicating zettel:', error);
        alert('Error duplicating zettel');
    }
    
    document.getElementById('customMenu').style.display = 'none';
    location.reload();
}

async function deleteZettel() {
    if (!selectedZettelId) return;
    
    if (!confirm('Are you sure you want to delete this zettel?')) return;
    
    try {
        const response = await fetch(`/zettelkasten/zettel/${selectedZettelId}/delete/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });
        
        if (response.ok) {
            // Remove the zettel from the UI
            const documentElement = document.querySelector(`.document[data-id="${selectedZettelId}"]`);
            documentElement.remove();
        } else {
            alert('Failed to delete zettel');
        }
    } catch (error) {
        console.error('Error deleting zettel:', error);
        alert('Error deleting zettel');
    }
    
    document.getElementById('customMenu').style.display = 'none';
    location.reload();
}

// Add empty zettel function
async function addEmptyZettel() {
    try {
        const response = await fetch('/zettelkasten/zettel/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ title: 'New Zettel' })
        });
        
        if (response.ok) {
            const data = await response.json();
            // Add the new zettel to the UI
            const folderContent = document.querySelector('.folder-content');
            const newZettel = document.createElement('div');
            newZettel.className = 'document';
            newZettel.dataset.type = 'document';
            newZettel.dataset.id = data.id;
            newZettel.innerHTML = `
                <span class="document-icon">📄</span>
                <span class="document-name">${data.title}</span>
            `;
            folderContent.insertBefore(newZettel, document.getElementById('customMenu'));
        } else {
            alert('Failed to create new zettel');
        }
    } catch (error) {
        console.error('Error creating new zettel:', error);
        alert('Error creating new zettel');
    }
    location.reload();
}

// Folder collapse functionality
document.querySelector('.folder-header').addEventListener('click', function(e) {
    // Don't trigger if clicking on the add button
    if (e.target.closest('.folder-bar')) return;
    
    this.classList.toggle('collapsed');
    
    // Save the collapsed state to localStorage
    const isCollapsed = this.classList.contains('collapsed');
    localStorage.setItem('folderCollapsed', isCollapsed);
});

// Restore collapsed state on page load
document.addEventListener('DOMContentLoaded', function() {
    const folderHeader = document.querySelector('.folder-header');
    const isCollapsed = localStorage.getItem('folderCollapsed') === 'true';
    if (isCollapsed) {
        folderHeader.classList.add('collapsed');
    }
});