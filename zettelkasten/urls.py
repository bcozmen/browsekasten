from django.urls import path
from . import views

app_name = 'zettelkasten'

urlpatterns = [
    path('', views.editor, name='editor'),
    path('zettel/<int:folder_id>/create_zettel/', views.create_zettel, name='create'),  # For specific folder
    path('zettel/<int:folder_id>/create_folder/', views.create_folder, name='create_folder'),  # For specific folder

    path('zettel/<str:item_type>/<int:item_id>/update_name/', views.update_item_name, name='update_item_name'),
    path('zettel/<str:item_type>/<int:item_id>/delete/', views.delete_item, name='delete_item'),
    path('zettel/<str:item_type>/<int:item_id>/move/', views.move_item, name='move_item'),
    path('zettel/upload/', views.upload, name='upload'),
    path('zettel/<int:folder_id>/download/', views.download, name='download'),
    path('zettel/<int:zettel_id>/get_zettel/', views.get_zettel, name='get'),

]   