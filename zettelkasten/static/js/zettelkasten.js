let selectedItem = null;
let currentZettelId = null;
let selectedZettelId = null;

let markdownViewer = document.getElementById('markdown-viewer');
let markdownEditor = document.getElementById('markdown-editor');


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







// Restore collapsed state on page load
document.addEventListener('DOMContentLoaded', function() {
    const folderHeader = document.querySelector('.folder-header');
    const isCollapsed = localStorage.getItem('folderCollapsed') === 'true';
    if (isCollapsed) {
        folderHeader.classList.add('collapsed');
    }
});


markdownEditor.addEventListener('input', () => {
    markdownViewer.innerHTML = marked.parse(markdownEditor.value);
    if (currentZettelId) {
    saveZettelContent(markdownEditor.value);
    }
});

document.querySelector('.file-manager').addEventListener('itemSelected', function(e) {
    if (e.detail.type === 'document') {
        loadZettelContent(e.detail.id);
        currentZettelId = e.detail.id;
    }
}); 







const fileManager = document.querySelector('.file-manager');
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






function getPrivacySettings(zettel_id) {
    return fetch(`/zettelkasten/zettel/${zettel_id}/privacy_settings/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
    })
    .then(response => response.json())
    .then(data => {
        return data.is_public;
    });
}


document.addEventListener('contextmenu', async function(e) {
    const documentElement = e.target.closest('.document');
    if (documentElement) {
        e.preventDefault();
        selectedZettelId = documentElement.dataset.id;
        var is_public = await getPrivacySettings(selectedZettelId);
        if (is_public) {
            document.getElementById('privacy_settings').textContent = 'Make Private';
        } else {
            document.getElementById('privacy_settings').textContent = 'Make Public';
        }

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




//context menu functionality
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

// Folder collapse functionality
document.querySelector('.folder-header').addEventListener('click', function(e) {
    // Don't trigger if clicking on the add button
    if (e.target.closest('.folder-bar')) return;
    
    this.classList.toggle('collapsed');
    
    // Save the collapsed state to localStorage
    const isCollapsed = this.classList.contains('collapsed');
    localStorage.setItem('folderCollapsed', isCollapsed);
});

