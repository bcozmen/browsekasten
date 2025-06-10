document.addEventListener('click', function (e) {
    // Optionally check if click was outside the menu
    customMenu.style.display = 'none';
  });
//resize functionality
document.addEventListener('DOMContentLoaded', function() {
    const resizers = document.querySelectorAll('.resizer');
    const columns = document.querySelectorAll('.column');
    
    
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
        
        console.log(newPrevWidth, newNextWidth);
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
    }

    
}); 



const fileManager = document.querySelector('.file-manager');
let selectedItem = null;
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

const markdownInput = document.getElementById('markdown-input');
markdownInput.addEventListener('input', () => {
    preview.innerHTML = marked.parse(markdownInput.value);
});



let currentZettelId = null;
//load zettel content when item is selected
document.querySelector('.file-manager').addEventListener('itemSelected', function(e) {
    if (e.detail.type === 'document') {
        loadZettelContent(e.detail.id);
        currentZettelId = e.detail.id;
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





document.getElementById('save-zettel-btn').addEventListener('click', () => {
    const markdown = document.getElementById('markdown-input').value;

    if (!currentZettelId) {
        return;
    }

    
    fetch(`/zettelkasten/zettel/${currentZettelId}/update/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },    
        body: JSON.stringify({ content: markdown })
    })
    
    
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