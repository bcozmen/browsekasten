function getZettelContent(zettelId) {
    return fetch(`/zettelkasten/zettel/${zettelId}/get/`)
        .then(response => response.json())
        .catch(error => console.error('Error loading Zettel content:', error));  
}


function getIsPublic(zettelId) {
    return fetch(`/zettelkasten/zettel/${zettelId}/get_is_public/`)
        .then(response => response.json())
        .catch(error => console.error('Error getting is public:', error));
}

async function makePublic(zettelId) {
    return fetch(`/zettelkasten/zettel/${zettelId}/make_public/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        }
    }).then(response => response.json())
    .catch(error => console.error('Error setting is public:', error));
}

async function makePrivate(zettelId) {
    return fetch(`/zettelkasten/zettel/${zettelId}/make_private/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        }
    }).then(response => response.json())
    .catch(error => console.error('Error setting is private:', error));
}

// Zettel operations
function setRenameZettel(zettelId, newTitle) {
    return fetch(`/zettelkasten/zettel/${zettelId}/rename/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ title: newTitle })
    }).then(response => response.json()).catch(error => console.error('Error renaming zettel:', error));
}

function setDuplicateZettel(zettelId) {
    return fetch(`/zettelkasten/zettel/${zettelId}/duplicate/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            }
        }).then(response => response.json())
        .catch(error => console.error('Error duplicating zettel:', error));
}

function setDeleteZettel(zettelId) {
    return fetch(`/zettelkasten/zettel/${zettelId}/delete/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        }).then(response => response.json())
        .catch(error => console.error('Error deleting zettel:', error));
}

function setCreateZettel(){
    return fetch('/zettelkasten/zettel/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ title: 'New Zettel' })
    }).then(response => response.json())
    .catch(error => console.error('Error adding empty zettel:', error));
}

async function setUpdateZettel(content, zettelId) {
    return fetch(`/zettelkasten/zettel/${zettelId}/update/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },    
        body: JSON.stringify({ content: content })
    }).then(response => response.json())
    .catch(error => console.error('Error saving zettel content:', error));
}


