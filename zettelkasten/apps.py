from django.apps import AppConfig


class ZettelkastenConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "zettelkasten"

    def ready(self):
        import zettelkasten.signals
