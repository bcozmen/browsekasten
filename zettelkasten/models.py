from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from taggit.managers import TaggableManager

class Folder(models.Model):
    name = models.CharField(max_length=250)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, related_name='children', null=True, blank=True)

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='folders')
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created']
        indexes = [
            models.Index(fields=['-created']),
        ]
        unique_together = ('author', 'name', 'parent')
    

class Zettel(models.Model):
    title = models.CharField(max_length=250)
    slug = models.SlugField(max_length=250)
    tags = TaggableManager(blank=True)
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='zettels', null=True, blank=True)

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='zettels')
    content = models.TextField()
    is_public = models.BooleanField(default=False)
    
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created']
        indexes = [
            models.Index(fields=['-created']),
        ]
        unique_together = [
            ('author', 'title'),
            ('author', 'folder', 'title'),
        ]

    def __str__(self):
        return self.title
    

