from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from taggit.managers import TaggableManager

class Folder(models.Model):
    name = models.CharField(max_length=250)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, related_name='children', null=True, blank=True)
    is_root = models.BooleanField(default=False)  # Flag to identify root folders

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='folders')
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created']
        indexes = [
            models.Index(fields=['-created']),
        ]
        unique_together = ('author', 'name', 'parent')
    
    def __str__(self):
        return f"{self.author.username}/{self.name}"
    
    def get_path(self):
        """Get the full path from root to this folder"""
        path_parts = []
        current = self
        
        # Traverse up the hierarchy until we reach root or no parent
        while current:
            path_parts.append(current.name)
            current = current.parent
        
        # Reverse to get root-to-current order
        path_parts.reverse()
        
        # Join with forward slashes
        return '/'.join(path_parts) + '/'
    
    @classmethod
    def get_user_root(cls, user):
        """Get or create the root folder for a user"""
        root_folder, created = cls.objects.get_or_create(
            author=user,
            is_root=True,
            defaults={
                'name': 'root',
                'parent': None
            }
        )
        return root_folder

class File(models.Model):
    name = models.CharField(max_length=250)
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='files', null=True, blank=True)  # Now required
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='files/')

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created']
        indexes = [
            models.Index(fields=['-created']),
        ]
        unique_together = ('author', 'folder', 'name')

    def __str__(self):
        return self.name

    def get_path(self):
        """Get the full path from root to this zettel file"""
        # Get the folder path and append the filename
        folder_path = self.folder.get_path()
        return folder_path + self.name

    def save(self, *args, **kwargs):
        # Ensure every zettel has a folder (default to user's root if none provided)
        if not self.folder_id:
            self.folder = Folder.get_user_root(self.author)
        super().save(*args, **kwargs)

class Zettel(models.Model):
    name = models.CharField(max_length=250)
    tags = TaggableManager(blank=True)

    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='zettels')  # Now required
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
            ('author', 'folder', 'name'),  # Only need per-folder uniqueness now
        ]

    def __str__(self):
        return self.name
    
    def get_path(self):
        """Get the full path from root to this zettel file"""
        # Get the folder path and append the filename
        folder_path = self.folder.get_path()
        return folder_path + self.name
    
    def update_tags(self):
        """Update tags for this zettel"""
        # This method can be expanded to handle tag updates if needed
        pass
    
    def save(self, *args, **kwargs):
        # Ensure every zettel has a folder (default to user's root if none provided)
        if not self.folder_id:
            self.folder = Folder.get_user_root(self.author)
        super().save(*args, **kwargs)
        # Call update_tags to ensure tags are updated after saving
        self.update_tags()
    

