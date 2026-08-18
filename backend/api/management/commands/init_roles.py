from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group
from django.db import transaction

class Command(BaseCommand):
    help = 'Initialize roles and permissions for the M&E System'

    def handle(self, *args, **options):
        self.stdout.write('Initializing roles and permissions...')
        
        # Define roles with their max users (0 = unlimited)
        roles_data = [
            {'name': 'Administrator', 'description': 'Full system access'},
            {'name': 'Executive Director', 'description': 'Organizational performance and reports'},
            {'name': 'Executive Officer', 'description': 'Organizational leadership and oversight'},
            {'name': 'Program Manager', 'description': 'Program management and monitoring'},
            {'name': 'M&E Officer', 'description': 'Monitoring, evaluation, and reporting'},
            {'name': 'M&E Personnel', 'description': 'Monitoring and evaluation personnel'},
            {'name': 'Data Officer', 'description': 'Data entry and management'},
            {'name': 'Therapist', 'description': 'Therapy sessions and progress'},
            {'name': 'Occupational Therapist', 'description': 'Occupational therapy'},
            {'name': 'Physiotherapist', 'description': 'Physiotherapy'},
            {'name': 'Speech Therapist', 'description': 'Speech therapy'},
            {'name': 'Nutrition Officer', 'description': 'Nutrition assessments and food distribution'},
            {'name': 'Community Outreach Officer', 'description': 'Outreach and community activities'},
            {'name': 'Social Worker', 'description': 'Social work and case management'},
            {'name': 'Caregiver Trainer', 'description': 'Training and workshops'},
            {'name': 'Logistics Officer', 'description': 'Inventory and logistics'},
            {'name': 'Communications Officer', 'description': 'Communications and success stories'},
            {'name': 'Volunteer', 'description': 'Limited access to assigned activities'},
            {'name': 'Guest', 'description': 'Read-only viewer'},
        ]
        
        with transaction.atomic():
            # Create Django groups for compatibility
            for role_data in roles_data:
                group, created = Group.objects.get_or_create(name=role_data['name'])
                if created:
                    self.stdout.write(f'✅ Created Django group: {group.name}')
            
            # Create default superuser if none exists
            if not User.objects.filter(is_superuser=True).exists():
                User.objects.create_superuser(
                    username='admin',
                    email='admin@bkinitiative.com',
                    password='admin123'
                )
                self.stdout.write('✅ Created default admin user: admin/admin123')
                self.stdout.write('⚠️  Please change the default password immediately!')
        
        self.stdout.write(self.style.SUCCESS('✅ Roles and permissions initialization complete!'))
