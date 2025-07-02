from django import forms
from .models import Zettel

class ZettelForm(forms.ModelForm):
    class Meta:
        model = Zettel
        fields = ['title', 'content']
        widgets = {
            'content': forms.Textarea(attrs={'rows': 50, 'id': 'markdown-editor'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)



