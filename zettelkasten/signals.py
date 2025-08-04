from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Folder


@receiver(post_save, sender=User)
def create_user_root_folder(sender, instance, created, **kwargs):
    """Automatically create a root folder when a user is created"""
    if created:
        Folder.objects.create(
            author=instance,
            name='root',
            is_root=True,
            parent=None
        )
