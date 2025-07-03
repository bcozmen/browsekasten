from django.urls import path
from . import views

app_name = 'zettelkasten'

urlpatterns = [
    path('', views.editor, name='editor'),
    path('zettel/<int:zettel_id>/content/', views.get, name='get'),
    path('zettel/<int:zettel_id>/update/', views.update, name='update'),
    path('zettel/create/', views.create, name='create'),
    path('zettel/<int:zettel_id>/rename/', views.rename, name='rename'),
    path('zettel/<int:zettel_id>/duplicate/', views.duplicate, name='duplicate'),
    path('zettel/<int:zettel_id>/delete/', views.delete, name='delete'),
    path('zettel/<int:zettel_id>/get_is_public/', views.get_is_public, name='get_is_public'),
    path('zettel/<int:zettel_id>/make_public/', views.make_public, name='make_public'),
    path('zettel/<int:zettel_id>/make_private/', views.make_private, name='make_private'),
    path('zettel/<int:zettel_id>/get/', views.get, name='get'),
]   