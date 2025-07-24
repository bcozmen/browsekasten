let rightClickMenuSelectedFile;
let selectedFiles = [];
let currentFile = null


function resetSelectedFiles() {
    selectedFiles.forEach(file => {
        file.classList.remove('selected');
    });
    selectedFiles = [];
}

function addSelectedFile(file) {
    file.classList.add('selected');
    selectedFiles.push(file);
}

let viewFile;

document.addEventListener('DOMContentLoaded', () => {
    
    const markdownViewer = document.getElementById('markdown-viewer');
    const markdownEditor = document.getElementById('markdown-editor');


    const folderHeader = document.getElementById('folder-header');
    const singleRightClickMenu = document.getElementById('singleRightClickMenu');
    const fileManager = document.getElementById('file-manager');
    const isCollapsed = localStorage.getItem('folderCollapsed') === 'true';
    const folderContent = document.getElementById('file-manager-column');
    
    const resizers = document.querySelectorAll('.resizer');
    const columns = document.querySelectorAll('.column');
    const container = document.querySelector('.zettelkasten-container');

    document.getElementById('singleRightClickMenu_rename_button').addEventListener('click', singleRightClickMenuRenameZettel);
    document.getElementById('singleRightClickMenu_duplicate_button').addEventListener('click', singleRightClickMenuDuplicateZettel);
    document.getElementById('singleRightClickMenu_delete_button').addEventListener('click', singleRightClickMenuDeleteZettel);
    document.getElementById('singleRightClickMenu_privacy_settings_button').addEventListener('click', singleRightClickMenuChangePrivacySettings);
    document.getElementById('multipleRightClickMenu_delete_button').addEventListener('click', multipleRightClickMenuDeleteZettel);
    document.getElementById('multipleRightClickMenu_make_public_button').addEventListener('click', multipleRightClickMenuMakePublic);
    document.getElementById('multipleRightClickMenu_make_private_button').addEventListener('click', multipleRightClickMenuMakePrivate);

    document.getElementById('add_button').addEventListener('click', CreateZettel);

    // Contenxt Menu
    
    // When clicking outside
    document.addEventListener('click', function(e) {
        // Close context menu when clicking outside
        if (!e.target.closest('#singleRightClickMenu')) {
            singleRightClickMenu.style.display = 'none';
        }
        if (!e.target.closest('#multipleRightClickMenu')) {
            multipleRightClickMenu.style.display = 'none';
        }
        // Close selected files when clicking outside
        if (!e.target.closest('#file-manager')) {
            // Remove selected class from all files
            selectedFiles.forEach(file => {
                file.classList.remove('selected');
            });
            selectedFiles = [];
            // Add selected class to displayed file
            if (selectedFiles.length > 0 ) {
                selectedFiles[0].classList.add('selected');
                selectedFiles.push(selectedFiles[0]);
            }
        }
    });

    // Open context menu on right click on a document   
    fileManager.addEventListener('contextmenu', async function(e) {
        e.preventDefault();
        
        if (selectedFiles.length <= 1) {
            rightClickMenuSelectedFile = e.target.closest('.file');

            if (rightClickMenuSelectedFile) {
                
                resetSelectedFiles();
                addSelectedFile(rightClickMenuSelectedFile);
                

                //Check it's public status and set the button text accordingly
                let data = await getIsPublic(rightClickMenuSelectedFile.dataset.id);
                if (data.is_public) {
                    document.getElementById('singleRightClickMenu_privacy_settings_button').textContent = 'Make Private';
                } else {
                    document.getElementById('singleRightClickMenu_privacy_settings_button').textContent = 'Make Public';
                }
        
                
                singleRightClickMenu.style.display = 'block';
                singleRightClickMenu.style.left = e.pageX + 'px';
                singleRightClickMenu.style.top = e.pageY + 'px';
            }
        }
        else {
            multipleRightClickMenu.style.display = 'block';
            multipleRightClickMenu.style.left = e.pageX + 'px';
            multipleRightClickMenu.style.top = e.pageY + 'px';
        }
        
        
    });


    markdownEditor.addEventListener('input', () => {
        markdownViewer.innerHTML = marked.parse(markdownEditor.value);
        if (selectedFiles[0]) {
            updateZettel(markdownEditor.value, selectedFiles[0].dataset.id);
        }
    });

    // Restore collapsed state on page load
    if (isCollapsed) {
        folderHeader.classList.add('collapsed');
    }



    
    // Click on a file will load the content of the zettel
    fileManager.addEventListener('click', function(e) {
        var newSelectedFile = e.target.closest('.folder-header, .file');
        if (!newSelectedFile) return;

        if (e.ctrlKey) {
            addSelectedFile(newSelectedFile);
        } else if (e.shiftKey) {
            old_file = selectedFiles[selectedFiles.length - 1];
            // get all the ordered <div class="file" data-type="file" data-id="{{ zettel.id }}" under <div class="folder-content" id="file-manager-column">
            const fileElements = Array.from(document.querySelectorAll('#file-manager-column .file'));
            // locate where the old file and new file are in the list
            const oldIndex = fileElements.indexOf(old_file);
            const newIndex = fileElements.indexOf(newSelectedFile);
            if (oldIndex !== -1 && newIndex !== -1) {
                // get everything in between including the old and new file and push them to selected files
                const [start, end] = oldIndex < newIndex ? [oldIndex, newIndex] : [newIndex, oldIndex];
                
                resetSelectedFiles();
                for (let i = start; i <= end; i++) {
                    fileElements[i].classList.add('selected');
                    selectedFiles.push(fileElements[i]);
                }
            }

        } else {
            resetSelectedFiles();
            addSelectedFile(newSelectedFile);
            if (newSelectedFile.dataset.type === 'file') {
                loadZettel(newSelectedFile.dataset.id, markdownViewer, markdownEditor);
            }
        }
    });


    folderHeader.addEventListener('click', function(e) {
        // Don't trigger if clicking on the add button
        if (e.target.closest('.folder-bar')) return;
        
        this.classList.toggle('collapsed');
        
        // Save the collapsed state to localStorage
        const isCollapsed = this.classList.contains('collapsed');
        localStorage.setItem('folderCollapsed', isCollapsed);
    });

    //resize functionality

    
    
    // Function to apply saved widths from localStorage
    function applySavedColumnWidths() {        
        columns.forEach(column => {
            var savedWidth = localStorage.getItem(`column-width-${column.id}`);
            if (savedWidth) {
                column.style.width = savedWidth * container.offsetWidth / 100 + 'px';
            }
        });
    }

    // Load saved widths from localStorage on page load

    applySavedColumnWidths();

    // Also apply saved widths on window resize (e.g., when opening inspect)
    window.addEventListener('resize', applySavedColumnWidths);
    window.addEventListener('load', applySavedColumnWidths);
    

    resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', initResize);
    });


});

    
