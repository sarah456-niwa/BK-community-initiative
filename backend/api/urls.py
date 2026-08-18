# backend/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'final-reports', FinalReportViewSet)
router.register(r'children', ChildViewSet)
router.register(r'documents', DocumentViewSet)
router.register(r'outreach', OutreachClinicViewSet)
router.register(r'assessments', AssessmentViewSet)
router.register(r'therapy', TherapySessionViewSet)
router.register(r'devices', AssistiveDeviceViewSet)
router.register(r'sensory-devices', SensoryDeviceViewSet)
router.register(r'training', CaregiverTrainingViewSet)
router.register(r'materials', EducationalMaterialViewSet)
router.register(r'nutrition', NutritionSupportViewSet)
router.register(r'food-parcels', FoodParcelViewSet)
router.register(r'community-outreach', CommunityOutreachViewSet)
router.register(r'referrals', ReferralViewSet)
router.register(r'meetings', MeetingViewSet)
router.register(r'challenges', ChallengeViewSet)
router.register(r'success-stories', SuccessStoryViewSet)

router.register(r'safeguarding', SafeguardingIncidentViewSet)
router.register(r'feedback', FeedbackViewSet)

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('', include(router.urls)),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('reports/', ReportView.as_view(), name='reports'),
    
    # NEW AI CHAT ENDPOINTS
    path('chat/', ChatView.as_view(), name='chat'),
    path('chat/report/', ChatReportView.as_view(), name='chat-report'),
    path('ai/providers/', AIProvidersView.as_view(), name='ai-providers'),
]