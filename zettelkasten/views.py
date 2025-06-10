from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils.safestring import mark_safe
import markdown
from .models import Zettel
from taggit.models import Tag
from .forms import ZettelForm
from django.views.decorators.http import require_POST
import json
from django.views.decorators.csrf import csrf_exempt

@login_required
def editor(request):
    zettels = Zettel.objects.filter(author=request.user).order_by('-created')
    context = {
        'zettels': zettels,
    }
    return render(request, 'zettelkasten/index.html', context)


    
@login_required
def get_zettel_content(request, zettel_id):
    zettel = get_object_or_404(Zettel, id=zettel_id, author=request.user)
    content = "<br/>\n\n---\n<br/>\n" + zettel.content
    return JsonResponse({
        'title': zettel.title,
        'author': zettel.author.username,
        'content': mark_safe(markdown.markdown(content)),
        'content_raw': zettel.content,
        'created': zettel.created.strftime('%Y-%m-%d %H:%M:%S'),
        'updated': zettel.updated.strftime('%Y-%m-%d %H:%M:%S'),
        'tags': list(zettel.tags.names())
    })

@login_required
@require_POST
def update_zettel(request, zettel_id):
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
def create_zettel(request):
    try:
        title = 0
        while Zettel.objects.filter(title=str(title) + ".md", author=request.user).exists():
            title += 1
        print(str(title) + ".md")

        zettel = Zettel(title=str(title) + ".md", author=request.user, is_public = False, content = "", slug = str(title), tags = "")
        zettel.save()

        return JsonResponse({'success': True, 'zettel_id': zettel.id})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)