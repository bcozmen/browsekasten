from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone


class Zettel(models.Model):
    title = models.CharField(max_length=250)
    slug = models.SlugField(max_length=250)

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
        unique_together = ('author', 'title')
    
    def __str__(self):
        return self.title
    
    def get_absolute_url(self):
        return reverse('zettelkasten:zettel_detail', args=[self.slug])

    def formatted_markdown(self):
        return markdownify(self.content)
