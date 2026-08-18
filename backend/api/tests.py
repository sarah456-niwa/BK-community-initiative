from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from api.models import Child, Referral


class LoginViewTests(APITestCase):
    def test_superuser_login_returns_admin_role_and_permissions(self):
        User = get_user_model()
        User.objects.create_superuser(
            username='admin-test',
            email='admin@example.com',
            password='secret123',
        )

        response = self.client.post(
            reverse('login'),
            {'username': 'admin-test', 'password': 'secret123'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['user']['is_superuser'])
        self.assertEqual(response.data['user']['role'], 'Administrator')
        self.assertTrue(response.data['user']['permissions'])


class UserManagementTests(APITestCase):
    def test_admin_can_create_user_with_role(self):
        User = get_user_model()
        admin = User.objects.create_user(
            username='admin-manager',
            email='admin-manager@example.com',
            password='admin123',
            is_staff=True,
        )
        self.client.force_authenticate(admin)

        response = self.client.post(
            reverse('user-list'),
            {
                'username': 'new-staff',
                'email': 'new-staff@example.com',
                'password': 'StrongPass123',
                'password2': 'StrongPass123',
                'first_name': 'New',
                'last_name': 'Staff',
                'role': 'Program Manager',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username='new-staff').exists())
        created_user = User.objects.get(username='new-staff')
        self.assertEqual(created_user.first_name, 'New')
        self.assertTrue(created_user.groups.filter(name='Program Manager').exists())


class ChatViewTests(APITestCase):
    def test_chat_view_includes_matching_child_context_and_crud_permissions(self):
        User = get_user_model()
        admin = User.objects.create_superuser(
            username='chat-admin',
            email='chat-admin@example.com',
            password='Secret123!',
        )
        Child.objects.create(
            full_name='Nowamani Mark',
            date_of_birth='2015-01-15',
            gender='M',
            caregiver_name='Jane Mark',
            caregiver_phone='0771234567',
            village='Kawempe',
            district='Kampala',
        )
        self.client.force_authenticate(admin)

        with patch('api.views.ai_manager.generate') as mock_generate:
            mock_generate.return_value = {'response': 'ok', 'provider_used': 'Test'}
            response = self.client.post(
                reverse('chat'),
                {'question': 'Tell me about Nowamani Mark'},
                format='json',
            )

        self.assertEqual(response.status_code, 200)
        system_message = mock_generate.call_args.kwargs['system_message']
        self.assertIn('Nowamani Mark', system_message)
        self.assertIn('FULL ACCESS', system_message)
        self.assertIn('all modules', system_message)
        self.assertIn('CREATE', system_message)
        self.assertIn('EDIT', system_message)
        self.assertIn('DELETE', system_message)


class ReferralViewTests(APITestCase):
    def test_referrals_list_endpoint_returns_success(self):
        User = get_user_model()
        user = User.objects.create_user(
            username='referral-viewer',
            email='referral-viewer@example.com',
            password='Secret123!',
        )
        child = Child.objects.create(
            full_name='Test Child',
            date_of_birth='2018-02-02',
            gender='F',
            caregiver_name='Test Caregiver',
            caregiver_phone='0770000000',
            village='Kampala',
            district='Kampala',
        )
        Referral.objects.create(
            child=child,
            referral_date='2026-01-01',
            referred_by='Clinic',
            referral_source='Hospital',
            referral_reason='Need support',
            status='PENDING',
            notes='Test referral',
        )
        self.client.force_authenticate(user)

        response = self.client.get(reverse('referral-list'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
