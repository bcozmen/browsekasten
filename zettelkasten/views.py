from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import Zettel, Folder
from django.views.decorators.http import require_POST
import json
from django.utils.text import slugify   
from django.utils.safestring import mark_safe
import markdown
import re
#mark_safe(markdown.markdown(content))

def get_folder_tree(folder):
    return {
        'name': folder.name,
        'children': [get_folder_tree(child) for child in folder.children.all()],
        'zettels': list(folder.zettels.all())
    }
@login_required
def editor(request):
    root_folders = Folder.objects.filter(author=request.user, parent=None).order_by('-created')
    root_zettels = Zettel.objects.filter(author=request.user, folder__isnull=True).order_by('-created')

    childeren = [get_folder_tree(f) for f in root_folders]
    zettels = Zettel.objects.filter(author=request.user).order_by('-created')

    folder_tree = {
        'name': 'Root',
        'children': childeren,
        'zettels': list(root_zettels)
    }
    context = {
        'folder_tree': folder_tree,
    }
    return render(request, 'zettelkasten/zettelkasten_home.html', context)


    
@login_required
def get(request, zettel_id):
    zettel = get_object_or_404(Zettel, id=zettel_id, author=request.user)
    return JsonResponse({
        'success': True,
        'title': zettel.title.replace(".md", "").replace("-", " ").replace("_", " "),
        'author': zettel.author.username,
        'contentRaw': zettel.content,
        'contentRendered': mark_safe(markdown.markdown(zettel.content)),
        'created': zettel.created.strftime('%Y-%m-%d %H:%M:%S'),
        'updated': zettel.updated.strftime('%Y-%m-%d %H:%M:%S'),
    })

@login_required
@require_POST
def create(request):
    try:
        title = 0
        while Zettel.objects.filter(title="new-zettel-" + str(title) , author=request.user).exists():
            title += 1
        title = "new-zettel-" + str(title)

        slug = slugify(title).lower()

        zettel = Zettel(title=title , author=request.user, is_public = False, content = "", slug = slug)
        zettel.save()

        return JsonResponse({'success': True, 'id': zettel.id, 'title': zettel.title})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required
@require_POST
def update(request, zettel_id):
    try:
        data = json.loads(request.body)
        content = data.get('content', '').strip()

        zettel = get_object_or_404(Zettel, id=zettel_id, author=request.user)
        zettel.content = content
        zettel.save()

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)





@login_required
@require_POST
def rename(request, zettel_id):
    try:
        data = json.loads(request.body)
        title = data.get('title', '').strip()

        if "." in title:
            title = title.split(".")[0]
        title = title.lower()

        #check if title is already taken, if so, add a number to the end
        if Zettel.objects.filter(title=title, author=request.user).exists():
            
            return JsonResponse({'success': False, 'error': "File name exists"}, status=400)

        zettel = get_object_or_404(Zettel, id=zettel_id, author=request.user)
        zettel.slug = slugify(title)
        zettel.title = title
        zettel.save()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_POST
def duplicate(request, zettel_id):
    try:
        zettel = get_object_or_404(Zettel, id=zettel_id, author=request.user)
        title_base = zettel.title + "-copy"
        title = 0
        while Zettel.objects.filter(title=title_base + "-" + str(title) , author=request.user).exists():
            title += 1
        title = title_base + "-" + str(title) 
        slug = slugify(title).lower()
        new_zettel = Zettel(title=title, author=request.user, is_public = zettel.is_public, content = zettel.content, slug = slugify(title).lower())
        new_zettel.save()
        return JsonResponse({'success': True, 'id': new_zettel.id, 'title': new_zettel.title})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required
def delete(request, zettel_id):
    if request.method != "DELETE":
        return JsonResponse({'success': False, 'error': "Method not allowed"}, status=405)
    try:
        zettel = get_object_or_404(Zettel, id=zettel_id, author=request.user)
        zettel.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required
@require_POST
def make_private(request, zettel_id):
    zettel = get_object_or_404(Zettel, id=zettel_id, author=request.user)
    zettel.is_public = False
    zettel.save()
    return JsonResponse({'success': True})

@login_required
@require_POST
def make_public(request, zettel_id):
    zettel = get_object_or_404(Zettel, id=zettel_id, author=request.user)
    zettel.is_public = True
    zettel.save()
    return JsonResponse({'success': True})



@login_required
def get_is_public(request, zettel_id):
    zettel = get_object_or_404(Zettel, id=zettel_id, author=request.user)
    return JsonResponse({'success': True, 'is_public': zettel.is_public})

