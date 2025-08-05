from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from .models import File, Zettel, Folder
from django.views.decorators.http import require_POST
import json
from django.utils.safestring import mark_safe
import markdown
import re
import io
import zipfile
#mark_safe(markdown.markdown(content))

def get_folder_tree(folder):
    return {
        'name': folder.name,
        'id': folder.id,
        'children': [get_folder_tree(child) for child in folder.children.all()],
        'zettels': list(folder.zettels.all()),
        'files': list(folder.files.all())
    }


@login_required
def editor(request):
    # Get user's root folder (created automatically on registration)
    root_folder = Folder.get_user_root(request.user)
    
    # Build folder tree starting from root
    folder_tree = get_folder_tree(root_folder)
    
    context = {
        'folder_tree': folder_tree,
    }
    return render(request, 'zettelkasten/ide.html', context)



@login_required
def get_zettel(request, zettel_id):
    zettel = get_object_or_404(Zettel, id=zettel_id, author=request.user)
    return JsonResponse({
        'success': True,
        'zettel_id': zettel.id,
        'is_public': zettel.is_public,
        'path': zettel.get_path(),
        'folder_id': zettel.folder.id if zettel.folder else None,
        'folder_name': zettel.folder.name if zettel.folder else None,
        'name': zettel.name.replace(".md", "").replace("-", " ").replace("_", " "),
        'author': zettel.author.username,
        'content': zettel.content,
        'created': zettel.created.strftime('%Y-%m-%d %H:%M:%S'),
        'updated': zettel.updated.strftime('%Y-%m-%d %H:%M:%S'),
    })

@login_required
@require_POST
def create_zettel(request, folder_id=None):
    try:
        # If no folder_id provided, use user's root folder
        if folder_id is None:
            target_folder = Folder.get_user_root(request.user)
        else:
            target_folder = get_object_or_404(Folder, id=folder_id, author=request.user)
        
        name = 0
        while Zettel.objects.filter(name="new-zettel-" + str(name), author=request.user, folder=target_folder).exists():
            name += 1
        name = "new-zettel-" + str(name)

        zettel = Zettel(
            name=name, 
            author=request.user, 
            is_public=False, 
            content="", 
            folder=target_folder
        )
        zettel.save()

        return JsonResponse({'success': True, 'id': zettel.id, 'name': zettel.name})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required
@require_POST
def create_folder(request, folder_id=None):
    try:
        # If no folder_id provided, use user's root folder
        if folder_id is None:
            target_folder = Folder.get_user_root(request.user)
        else:
            target_folder = get_object_or_404(Folder, id=folder_id, author=request.user)

        name = 0
        while Folder.objects.filter(name="new-folder-" + str(name), author=request.user, parent=target_folder).exists():
            name += 1
        name = "new-folder-" + str(name)

        new_folder = Folder(name=name, author=request.user, parent=target_folder)
        new_folder.save()

        return JsonResponse({'success': True, 'id': new_folder.id, 'name': new_folder.name})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
from django.views.decorators.http import require_http_methods

@login_required
@require_http_methods(["DELETE"])
def delete_item(request, item_type, item_id):
    #check if its root folder
    print("AA")
    if item_type == 'folder' and item_id == Folder.get_user_root(request.user).id:
        #delete all items, zettels and childeren folders
        Folder.objects.filter(author=request.user).delete()
        print("aa")
        return JsonResponse({'success': True, 'message': 'Root folder and all its contents deleted successfully'})

    model_map = {
        'folder': Folder,
        'zettel': Zettel,
        'file': File,
    }
    model = model_map.get(item_type)
    if not model:
        return JsonResponse({'success': False, 'error': 'Invalid type'}, status=400)
    try:
        obj = get_object_or_404(model, id=item_id, author=request.user)
        obj.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required
@require_http_methods(["POST"])
def update_item_name(request, item_type, item_id):
    """Update the name of a zettel or file"""
    model_map = {
        'zettel': Zettel,
        'file': File,
        'folder': Folder,
    }
    model = model_map.get(item_type)
    if not model:
        return JsonResponse({'success': False, 'error': 'Invalid type'}, status=400)
    
    try:
        data = json.loads(request.body)
        new_name = data.get('new_name', '').strip()
        
        if not new_name:
            return JsonResponse({'success': False, 'error': 'Name cannot be empty'}, status=400)
        
        obj = get_object_or_404(model, id=item_id, author=request.user)
        obj.name = new_name
        obj.save()
        
        return JsonResponse({'success': True, 'name': obj.name})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required
@require_http_methods(["POST"])
def upload(request):
    """Upload files to a specific folder - supports both files and folder structures"""
    try:
        folder_id = request.POST.get('folder_id')
        if not folder_id:
            target_folder = Folder.get_user_root(request.user)
        else:
            # Check if folder exists and belongs to user
            try:
                target_folder = Folder.objects.get(id=folder_id, author=request.user)
            except Folder.DoesNotExist:
                # Try to find any folder with this ID (for debugging)
                folder_exists = Folder.objects.filter(id=folder_id).first()

                # Show user's available folders for debugging
                user_folders = Folder.objects.filter(author=request.user)
                
                return JsonResponse({'success': False, 'error': f'Folder with ID {folder_id} not found or access denied'}, status=404)
        
        if 'files' not in request.FILES:
            return JsonResponse({'success': False, 'error': 'No files uploaded'}, status=400)
        
        files = request.FILES.getlist('files')
        file_paths = request.POST.getlist('file_paths')
        has_folder_structure = request.POST.get('has_folder_structure', 'false').lower() == 'true'
        
        
        if len(files) != len(file_paths):
            return JsonResponse({'success': False, 'error': 'Files and paths count mismatch'}, status=400)
        

        file_tree = build_file_tree(files, file_paths)
        created_items = create_file_tree(request, file_tree, target_folder)

        return JsonResponse({
            'success': True, 
            'message': 'Files uploaded successfully',
            'files': created_items or []
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)






def build_file_tree(files, paths):
    tree = {}
    """Build a nested dictionary structure from file paths"""
    for path, file in zip(paths, files):
        if not path or not path.strip():
            continue
            
        parts = [part for part in path.strip().split('/') if part]  # Filter out empty parts
        if not parts:
            continue   
        
        node = tree
        for part in parts[:-1]:
            if part not in node:
                node[part] = {}
            node = node[part]

        filename = parts[-1]
        if not filename:  # Skip if filename is empty
            continue
            
        full_path = "/".join(parts)
        node[filename] = {
            'name': filename,
            'path': full_path,
            'file': file,
            'is_file': True,
        }
    if len(tree.keys()) == 1 and "root" in tree.keys():
        return tree["root"]

@login_required
def create_file_tree(request, tree, node):
    created_items = []
    
    for key, value in tree.items():
        if isinstance(value, dict) and 'is_file' not in value:
            # This is a folder
            existing_folder = Folder.objects.filter(name=key, parent=node, author=request.user).first()
            if existing_folder:
                folder_node = existing_folder
            else:
                # Create the folder if it doesn't exist
                new_folder = Folder(name=key, parent=node, author=request.user)
                new_folder.save()
                folder_node = new_folder
            # Recursively create contents of this folder
            created_items.extend(create_file_tree(request, value, folder_node))
        elif isinstance(value, dict) and 'is_file' in value and value['is_file']:
            # This is a file
            file_info = create_files(request, value, node)
            if file_info:
                created_items.append(file_info)
    
    return created_items
@login_required
def create_files(request, value, node):
    filename = value['name']
    full_path = value['path']
    
    # Create the file in the final folder
    if ".md" in filename:
        new_zettel = Zettel(
            name=filename.replace(".md", ""),
            author=request.user,
            is_public=False,
            content=value['file'].read().decode('utf-8'),
            folder=node
        )
        new_zettel.save()
        return {
            'id': new_zettel.id,
            'name': new_zettel.name,
            'path': full_path,
            'folder_id': node.id,
        }
    else:
        new_file = File(
            name=filename,
            author=request.user,
            folder=node,
            file=value['file']
        )
        new_file.save()
        return {
            'id': new_file.id,
            'name': new_file.name,
            'path': full_path,
            'folder_id': node.id,
        }



def print_file_tree(tree, indent=0):
    for key, value in tree.items():
        if isinstance(value, dict) and 'is_file' in value and value['is_file']:
            # This is a file
            print('  ' * indent + f"- {value['name']} ({value['path']})")
        elif isinstance(value, dict) and 'is_file' not in value:
            # This is a folder
            print('  ' * indent + f"[Folder] {key}")
            print_file_tree(value, indent + 1)

@login_required
def download(request, folder_id):
    """Download a folder as a zip file"""
    folder = get_object_or_404(Folder, id=folder_id, author=request.user)
    
    # Create a zip file in memory
    zip_buffer = io.BytesIO()
    
    def add_folder_to_zip(zip_file, folder, base_path=""):
        """Recursively add folder contents to zip"""
        # Add all zettels in this folder
        for zettel in folder.zettels.all():
            file_path = f"{base_path}{zettel.name}.md"
            zettel_content = zettel.content.encode('utf-8')
            zip_file.writestr(file_path, zettel_content)
        
        # Add all files in this folder
        for file_obj in folder.files.all():
            file_path = f"{base_path}{file_obj.name}"
            try:
                file_obj.file.seek(0)  # Reset file pointer
                zip_file.writestr(file_path, file_obj.file.read())
            except Exception as e:
                # If file reading fails, create a placeholder
                zip_file.writestr(file_path, f"Error reading file: {str(e)}".encode('utf-8'))
        
        # Recursively add subfolders
        for subfolder in folder.children.all():
            subfolder_path = f"{base_path}{subfolder.name}/"
            add_folder_to_zip(zip_file, subfolder, subfolder_path)
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        add_folder_to_zip(zip_file, folder)
    
    zip_buffer.seek(0)
    
    # Create HTTP response with zip file
    response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="{folder.name}.zip"'
    response['Content-Length'] = len(zip_buffer.getvalue())
    
    return response

@login_required
@require_http_methods(["POST"])
def move_item(request, item_type, item_id):
    """Move a file, zettel, or folder to a different folder"""
    model_map = {
        'folder': Folder,
        'zettel': Zettel,
        'file': File,
    }
    
    model = model_map.get(item_type)
    if not model:
        return JsonResponse({'success': False, 'error': 'Invalid type'}, status=400)
    
    try:
        data = json.loads(request.body)
        target_folder_id = data.get('target_folder_id')
        
        if not target_folder_id:
            return JsonResponse({'success': False, 'error': 'Target folder ID is required'}, status=400)
        
        # Get the item to move
        obj = get_object_or_404(model, id=item_id, author=request.user)
        
        # Get the target folder
        target_folder = get_object_or_404(Folder, id=target_folder_id, author=request.user)
        
        # Prevent moving folder into itself or its descendants
        if item_type == 'folder':
            current = target_folder
            while current:
                if current.id == obj.id:
                    return JsonResponse({'success': False, 'error': 'Cannot move folder into itself or its descendants'}, status=400)
                current = current.parent
        
        # Move the item
        if item_type == 'folder':
            obj.parent = target_folder
        else:  # zettel or file
            obj.folder = target_folder
        
        obj.save()
        
        return JsonResponse({'success': True, 'message': f'{item_type.title()} moved successfully'})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

def create_zip(folder):
    """Create a zip file from a folder recursively"""
    zip_buffer = io.BytesIO()
    
    def add_folder_to_zip(zip_file, folder, base_path=""):
        """Recursively add folder contents to zip"""
        # Add all zettels in this folder
        for zettel in folder.zettels.all():
            file_path = f"{base_path}{zettel.name}.md"
            zettel_content = zettel.content.encode('utf-8')
            zip_file.writestr(file_path, zettel_content)
        
        # Add all files in this folder
        for file_obj in folder.files.all():
            file_path = f"{base_path}{file_obj.name}"
            try:
                file_obj.file.seek(0)  # Reset file pointer
                zip_file.writestr(file_path, file_obj.file.read())
            except Exception as e:
                # If file reading fails, create a placeholder
                zip_file.writestr(file_path, f"Error reading file: {str(e)}".encode('utf-8'))
        
        # Recursively add subfolders
        for subfolder in folder.children.all():
            subfolder_path = f"{base_path}{subfolder.name}/"
            add_folder_to_zip(zip_file, subfolder, subfolder_path)
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        add_folder_to_zip(zip_file, folder)
    
    zip_buffer.seek(0)
    return zip_buffer

@login_required
@require_http_methods(["POST"])
def update_zettel(request, zettel_id):
    """Update the content of a zettel"""
    zettel = get_object_or_404(Zettel, id=zettel_id, author=request.user)
    data = json.loads(request.body)
    new_content = data.get('content')

    if not new_content:
        return JsonResponse({'success': False, 'error': 'Content is required'}, status=400)

    zettel.content = new_content
    zettel.save()

    return JsonResponse({'success': True, 'message': 'Zettel updated successfully'})    