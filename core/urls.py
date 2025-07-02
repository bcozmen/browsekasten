from django.contrib import admin
from django.urls import path, include
from account import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.home, name='home'),
    path('account/', include('account.urls')),
    path('zettelkasten/', include('zettelkasten.urls')),
    path('graph/', include('graph.urls')),
    path('blog/', include('blog.urls')),
] 