from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from zettelkasten.models import Zettel
import re
import json


# Create your views here.
@login_required
def network(request):
    zettels = Zettel.objects.filter(author=request.user)
    
    graph_data = []
    for zettel in zettels:
        graph_data.append({
            'data': {'id': zettel.name, 'label': zettel.name},
        })

    pattern = r'\[.*?\]\(.*?\)'

    for zettel in zettels:
        
        if re.search(pattern, zettel.content):
            matches = re.findall(pattern, zettel.content)
            for match in matches:
                this_id = zettel.name
                that_id = match.split("(")[1].split(")")[0]
                if Zettel.objects.filter(name=that_id).exists():
                    graph_data.append({
                        'data': {'source': this_id, 'target': that_id},
                    })


    return render(request, 'graph/network.html', {'graph_data_json': json.dumps(graph_data)})