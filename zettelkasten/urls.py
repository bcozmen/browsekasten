from django.urls import path
from . import views

app_name = 'zettelkasten'

urlpatterns = [
    path('', views.editor, name='editor'),
    path('zettel/<int:folder_id>/create_zettel/', views.create_zettel, name='create'),  # For specific folder
    path('zettel/<int:folder_id>/create_folder/', views.create_folder, name='create_folder'),  # For specific folder

    path('zettel/<int:folder_id>/delete_folder/', views.delete_folder, name='delete_folder'),  # For specific folder
    path('zettel/<int:zettel_id>/delete_zettel/', views.delete_zettel, name='delete_zettel'),  # For specific file
    path('zettel/<int:zettel_id>/get_zettel/', views.get_zettel, name='get'),

]   