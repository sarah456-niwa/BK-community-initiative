import sys
import os
import django
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bk_mis.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from api.views import ReportView
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.filter(is_superuser=True).first()

factory = APIRequestFactory()
request = factory.post('/api/reports/', {
    'report_type': 'summary',
    'modules': ['children'],
    'format': 'pdf'
}, format='json')

force_authenticate(request, user=user)

response = ReportView.as_view()(request)
print("Status Code:", response.status_code)
print("Content-Type:", response['Content-Type'])
print("Content-Disposition:", response.get('Content-Disposition', 'N/A'))
if response['Content-Type'] == 'application/json':
    if hasattr(response, 'render'):
        response.render()
    print("Content:", response.content.decode('utf-8'))
else:
    if hasattr(response, 'render'):
        response.render()
    print("Content Length:", len(response.content))
