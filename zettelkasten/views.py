from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import Zettel, Folder
from django.views.decorators.http import require_POST
import json
from django.utils.safestring import mark_safe
import markdown
import re
#mark_safe(markdown.markdown(content))

def get_folder_tree(folder):
    return {
        'name': folder.name,
        'id': folder.id,
        'children': [get_folder_tree(child) for child in folder.children.all()],
        'zettels': list(folder.zettels.all())
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
        'title': zettel.title.replace(".md", "").replace("-", " ").replace("_", " "),
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
        
        title = 0
        while Zettel.objects.filter(title="new-zettel-" + str(title), author=request.user, folder=target_folder).exists():
            title += 1
        title = "new-zettel-" + str(title)

        zettel = Zettel(
            title=title, 
            author=request.user, 
            is_public=False, 
            content="", 
            folder=target_folder
        )
        zettel.save()

        return JsonResponse({'success': True, 'id': zettel.id, 'title': zettel.title})
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

        title = 0
        while Folder.objects.filter(name="new-folder-" + str(title), author=request.user, parent=target_folder).exists():
            title += 1
        title = "new-folder-" + str(title)

        new_folder = Folder(name=title, author=request.user, parent=target_folder)
        new_folder.save()

        return JsonResponse({'success': True, 'id': new_folder.id, 'name': new_folder.name})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
@login_required
def delete_folder(request, folder_id):
    try:
        folder = get_object_or_404(Folder, id=folder_id, author=request.user)
        folder.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
@login_required
def delete_zettel(request, zettel_id):
    try:
        zettel = get_object_or_404(Zettel, id=zettel_id, author=request.user)
        zettel.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)