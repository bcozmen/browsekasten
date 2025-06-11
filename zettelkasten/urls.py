from django.urls import path
from . import views

app_name = 'zettelkasten'

urlpatterns = [
    path('', views.editor, name='editor'),
    path('zettel/<int:zettel_id>/content/', views.get_zettel_content, name='get_zettel_content'),
    path('zettel/<int:zettel_id>/update/', views.update_zettel, name='update_zettel'),
    path('zettel/create/', views.create_zettel, name='create_zettel'),
    path('zettel/<int:zettel_id>/rename/', views.rename_zettel, name='rename_zettel'),
    path('zettel/<int:zettel_id>/duplicate/', views.duplicate_zettel, name='duplicate_zettel'),
    path('zettel/<int:zettel_id>/delete/', views.delete_zettel, name='delete_zettel'),
]   
