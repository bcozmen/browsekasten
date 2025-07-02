from django import template
import markdown
from django.utils.safestring import mark_safe
register = template.Library()

@register.filter
def deslug(value):
    return value.replace('-', ' ')

@register.filter(name='markdown')
def markdown_format(text):
	return mark_safe(markdown.markdown(text))

#make first letter of each word uppercase
@register.filter
def capitalize_first(value):
    return value.title()