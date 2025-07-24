from django.core.paginator import Paginator
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404

from zettelkasten.models import Zettel

# Create your views here.
@login_required
def blog(request):
    zettels = Zettel.objects.filter(author=request.user, is_public = True).order_by('-created')

    paginator = Paginator(zettels, 10)  # 5 posts per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    context = {
        'zettels': page_obj,
    }
    return render(request, 'blog/blog_home.html', context)

@login_required
def blog_post(request, slug):
    zettel = get_object_or_404(Zettel, slug=slug, is_public = True)
    
    context = {
        'blog_post': zettel,
    }
    return render(request, 'blog/blog_home.html', context)