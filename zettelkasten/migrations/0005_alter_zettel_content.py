# Generated by Django 5.1.2 on 2025-06-10 21:07

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("zettelkasten", "0004_alter_zettel_content"),
    ]

    operations = [
        migrations.AlterField(
            model_name="zettel",
            name="content",
            field=models.TextField(),
        ),
    ]
