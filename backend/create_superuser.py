import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bk_mis.settings')
import django
django.setup()
from django.contrib.auth import get_user_model

User = get_user_model()
u, created = User.objects.get_or_create(username='bkadmin')
u.set_password('BKadmin123!')
u.is_staff = True
u.is_superuser = True
u.save()
print('created' if created else 'updated', u.username, 'is_superuser', u.is_superuser)
