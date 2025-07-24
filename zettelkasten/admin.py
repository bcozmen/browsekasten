from django.contrib import admin
from .models import Zettel, Folder



@admin.register(Zettel)
class ZettelAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'created', 'updated', 'is_public', 'id']
    list_filter = ['created', 'updated', 'author', 'is_public']
    search_fields = ['title', 'content']
    prepopulated_fields = {'slug': ('title',)}
    raw_id_fields = ['author']
    date_hierarchy = 'created'
    ordering = ['-created']

@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'created', 'updated']
    list_filter = ['created', 'updated']
    search_fields = ['name']
    raw_id_fields = ['parent']
    date_hierarchy = 'created'
    ordering = ['-created']
    
