from django.urls import path
from . import views

app_name = 'zettelkasten'

urlpatterns = [
    path('', views.editor, name='editor'),
    path('zettel/<int:zettel_id>/content/', views.get_zettel, name='get_zettel'),
    path('zettel/<int:zettel_id>/update/', views.update_zettel_content, name='update_zettel_content'),
    path('zettel/create/', views.create_zettel, name='create_zettel'),
    path('zettel/<int:zettel_id>/rename/', views.rename_zettel, name='rename_zettel'),
    path('zettel/<int:zettel_id>/duplicate/', views.duplicate_zettel, name='duplicate_zettel'),
    path('zettel/<int:zettel_id>/delete/', views.delete_zettel, name='delete_zettel'),
    path('zettel/<int:zettel_id>/make_private/', views.make_private, name='make_private'),
    path('zettel/<int:zettel_id>/make_public/', views.make_public, name='make_public'),
    path('zettel/<int:zettel_id>/privacy_settings/', views.get_privacy_settings, name='get_privacy_settings'),
]   