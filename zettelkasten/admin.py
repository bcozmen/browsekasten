from django.contrib import admin
from .models import Zettel



@admin.register(Zettel)
class ZettelAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'created', 'updated', 'is_public', 'id']
    list_filter = ['created', 'updated', 'author', 'is_public']
    search_fields = ['title', 'content']
    prepopulated_fields = {'slug': ('title',)}
    raw_id_fields = ['author']
    date_hierarchy = 'created'
    ordering = ['-created']
