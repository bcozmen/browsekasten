from django.contrib import admin
from .models import Zettel, Folder, File


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ('name', 'author', 'created', 'updated', 'is_root')
    search_fields = ('name',)
    list_filter = ('author', 'is_root')
    ordering = ('-created',)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('author').prefetch_related('children')
    

@admin.register(Zettel)
class ZettelAdmin(admin.ModelAdmin):
    list_display = ('name', 'author', 'folder', 'created', 'updated', 'is_public')
    search_fields = ('name', 'content')
    list_filter = ('author', 'folder', 'is_public')
    ordering = ('-created',)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('author', 'folder').prefetch_related('tags')

@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ('name', 'author', 'folder', 'created', 'updated')
    search_fields = ('name',)
    list_filter = ('author', 'folder')
    ordering = ('-created',)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('author', 'folder')