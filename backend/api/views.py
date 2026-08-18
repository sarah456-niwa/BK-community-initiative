# backend/api/views.py
import re
from io import BytesIO
from django.http import HttpResponse
from rest_framework import viewsets, generics, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import timedelta, datetime
from docx import Document
from openpyxl import Workbook
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from .models import *
from django.contrib.auth.models import User
from .serializers import *
from .permissions import *
from .ai.manager import ai_manager  # NEW IMPORT

# ============================================
# USER PERMISSIONS HELPER
# ============================================
def _build_user_permissions(user):
    if user.is_superuser:
        modules = [
            'DASHBOARD', 'CHILDREN', 'THERAPY', 'ASSESSMENTS',
            'NUTRITION', 'OUTREACH', 'SUCCESS_STORIES', 'REPORTS',
            'DEVICES', 'TRAINING', 'MEETINGS', 'COMMUNITY',
            'EDUCATIONAL_MATERIALS', 'SENSORY_DEVICES', 'FOOD_PARCELS'
        ]
        return [
            {'module': m, 'action': a} for m in modules
            for a in ['VIEW', 'CREATE', 'EDIT', 'DELETE']
        ] + [
            {'module': 'REPORTS', 'action': 'GENERATE_REPORT'},
            {'module': 'USER_MANAGEMENT', 'action': 'MANAGE_USERS'},
        ]

    group_names = set(user.groups.values_list('name', flat=True))
    normalized_group_names = {
        re.sub(r'\s+', '', g).strip().lower()
        for g in group_names
    }

    role_modules = []
    extra_perms = []

    is_admin_or_exec = any(
        g in ['administrator', 'executiveofficer']
        for g in normalized_group_names
    )

    if is_admin_or_exec:
        role_modules = [
            'DASHBOARD', 'CHILDREN', 'THERAPY', 'ASSESSMENTS',
            'NUTRITION', 'OUTREACH', 'SUCCESS_STORIES', 'REPORTS',
            'DEVICES', 'TRAINING', 'MEETINGS', 'COMMUNITY',
            'EDUCATIONAL_MATERIALS', 'SENSORY_DEVICES', 'FOOD_PARCELS'
        ]
        extra_perms = [
            {'module': 'REPORTS', 'action': 'GENERATE_REPORT'},
            {'module': 'USER_MANAGEMENT', 'action': 'MANAGE_USERS'},
        ]
    elif 'Program Manager' in group_names or 'M&E Personnel' in group_names:
        role_modules = [
            'DASHBOARD', 'CHILDREN', 'THERAPY', 'ASSESSMENTS',
            'NUTRITION', 'OUTREACH', 'SUCCESS_STORIES', 'REPORTS',
            'DEVICES', 'TRAINING', 'MEETINGS', 'COMMUNITY',
            'EDUCATIONAL_MATERIALS', 'SENSORY_DEVICES', 'FOOD_PARCELS'
        ]
        extra_perms = [
            {'module': 'REPORTS', 'action': 'GENERATE_REPORT'},
        ]
    elif 'Therapist' in group_names:
        role_modules = [
            'DASHBOARD', 'CHILDREN', 'THERAPY', 'ASSESSMENTS',
            'OUTREACH', 'SUCCESS_STORIES', 'REPORTS',
            'COMMUNITY', 'FOOD_PARCELS', 'EDUCATIONAL_MATERIALS',
            'REPORTS'
        ]
    elif 'Nutrition Officer' in group_names:
        role_modules = ['DASHBOARD', 'NUTRITION', 'CHILDREN', 'ASSESSMENTS', 'FOOD_PARCELS']
    elif 'Community Outreach Officer' in group_names:
        role_modules = ['DASHBOARD', 'OUTREACH', 'COMMUNITY', 'CHILDREN', 'ASSESSMENTS']
    elif 'Caregiver Trainer' in group_names:
        role_modules = ['DASHBOARD', 'TRAINING', 'CHILDREN', 'ASSESSMENTS']
    elif 'Guest' in group_names:
        role_modules = ['DASHBOARD', 'REPORTS']
        return [{'module': m, 'action': 'VIEW'} for m in role_modules]
    elif 'Volunteer' in group_names:
        role_modules = ['DASHBOARD', 'CHILDREN', 'OUTREACH', 'COMMUNITY']
        return [{'module': m, 'action': 'VIEW'} for m in role_modules]
    else:
        role_modules = ['DASHBOARD']
        return [{'module': m, 'action': 'VIEW'} for m in role_modules]

    perms = [
        {'module': m, 'action': a}
        for m in role_modules
        for a in ['VIEW', 'CREATE', 'EDIT', 'DELETE']
    ]
    return perms + extra_perms


# ============================================
# USER MANAGEMENT VIEWSET
# ============================================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'date_joined']

    def get_permissions(self):
        # Allow list/retrieve for any authenticated user
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]

        # For create/update/destroy, allow administrators or Executive Officer group
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanManageUsers()]

        return [IsAuthenticated(), IsAdministrator()]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        headers = self.get_success_headers(serializer.data)
        response_serializer = UserSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


# ============================================
# AUTHENTICATION VIEW
# ============================================
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'detail': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(username=username, password=password)

        if user is None:
            return Response(
                {'detail': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        groups = list(user.groups.values_list('name', flat=True))
        role = 'Administrator' if user.is_superuser else (groups[0] if groups else 'User')

        canonical_roles = {
            'executiveofficer': 'Executive Officer',
            'programmanager': 'Program Manager',
            'm&epersonnel': 'M&E Personnel',
            'therapist': 'Therapist',
            'nutritionofficer': 'Nutrition Officer',
            'caregivertrainer': 'Caregiver Trainer',
            'communityoutreachofficer': 'Community Outreach Officer',
            'guest': 'Guest',
            'volunteer': 'Volunteer',
        }
        normalized_role = re.sub(r'\s+', '', role).strip().lower()
        role = canonical_roles.get(normalized_role, role)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_superuser': user.is_superuser,
                'is_staff': user.is_staff,
                'role': role,
                'permissions': _build_user_permissions(user),
                'groups': groups,
            }
        }, status=status.HTTP_200_OK)


# ============================================
# CHILD VIEWSET
# ============================================
class ChildViewSet(viewsets.ModelViewSet):
    queryset = Child.objects.all()
    serializer_class = ChildSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'gender', 'disability_type']
    search_fields = ['full_name', 'child_id', 'village', 'district']
    ordering_fields = ['full_name', 'date_of_birth']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # pyrefly: ignore [unknown-name]
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def assessments(self, request, pk=None):
        child = self.get_object()
        assessments = child.assessments.all()
        serializer = AssessmentSerializer(assessments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def therapy_sessions(self, request, pk=None):
        child = self.get_object()
        sessions = child.therapy_sessions.all()
        serializer = TherapySessionSerializer(sessions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        child = self.get_object()
        documents = child.documents.all()
        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def devices(self, request, pk=None):
        child = self.get_object()
        devices = child.devices.all()
        serializer = AssistiveDeviceSerializer(devices, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def nutrition_records(self, request, pk=None):
        child = self.get_object()
        records = child.nutrition_records.all()
        serializer = NutritionSupportSerializer(records, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def success_stories(self, request, pk=None):
        child = self.get_object()
        stories = child.success_stories.all()
        serializer = SuccessStorySerializer(stories, many=True)
        return Response(serializer.data)


# ============================================
# DOCUMENT VIEWSET
# ============================================
class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['child', 'document_type']
    search_fields = ['title', 'description']
    ordering_fields = ['uploaded_at']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # pyrefly: ignore [unknown-name]
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# REFERRAL VIEWSET
class ReferralViewSet(viewsets.ModelViewSet):
    queryset = Referral.objects.all()
    serializer_class = ReferralSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['child', 'status', 'referral_source']
    search_fields = ['referred_by', 'notes']
    ordering_fields = ['referral_date', 'status']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # pyrefly: ignore [unknown-name]
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# OUTREACH CLINIC VIEWSET

class OutreachClinicViewSet(viewsets.ModelViewSet):
    queryset = OutreachClinic.objects.all()
    serializer_class = OutreachClinicSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['district', 'village']
    search_fields = ['venue', 'district', 'village']
    ordering_fields = ['date', 'number_attended']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # pyrefly: ignore [unknown-name]
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# ASSESSMENT VIEWSET
# ============================================
class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['child', 'assessment_type']
    search_fields = ['findings', 'recommendations']
    ordering_fields = ['date']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # pyrefly: ignore [unknown-name]
            return [IsAuthenticated(), IsTherapistOrHigher()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# THERAPY SESSION VIEWSET
# ============================================
class TherapySessionViewSet(viewsets.ModelViewSet):
    queryset = TherapySession.objects.all()
    serializer_class = TherapySessionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['child', 'therapy_type']
    search_fields = ['outcome', 'notes']
    ordering_fields = ['date', 'hours']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # pyrefly: ignore [unknown-name]
            return [IsAuthenticated(), IsTherapistOrHigher()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# ASSISTIVE DEVICE VIEWSET
# ============================================
class AssistiveDeviceViewSet(viewsets.ModelViewSet):
    queryset = AssistiveDevice.objects.all()
    serializer_class = AssistiveDeviceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['child', 'condition']
    search_fields = ['device_type', 'serial_number']
    ordering_fields = ['date_issued']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# SENSORY DEVICE VIEWSET
# ============================================
class SensoryDeviceViewSet(viewsets.ModelViewSet):
    queryset = SensoryDevice.objects.all()
    serializer_class = SensoryDeviceSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['child']
    ordering_fields = ['date_distributed']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# CAREGIVER TRAINING VIEWSET
# ============================================
class CaregiverTrainingViewSet(viewsets.ModelViewSet):
    queryset = CaregiverTraining.objects.all()
    serializer_class = CaregiverTrainingSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['workshop_name', 'trainer']
    ordering_fields = ['date', 'attendance']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# EDUCATIONAL MATERIAL VIEWSET
# ============================================
class EducationalMaterialViewSet(viewsets.ModelViewSet):
    queryset = EducationalMaterial.objects.all()
    serializer_class = EducationalMaterialSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['material_name', 'recipient']
    ordering_fields = ['date_distributed', 'quantity']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# NUTRITION SUPPORT VIEWSET
# ============================================
class NutritionSupportViewSet(viewsets.ModelViewSet):
    queryset = NutritionSupport.objects.all()
    serializer_class = NutritionSupportSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['child']
    ordering_fields = ['assessment_date']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# FOOD PARCEL VIEWSET
# ============================================
class FoodParcelViewSet(viewsets.ModelViewSet):
    queryset = FoodParcel.objects.all()
    serializer_class = FoodParcelSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['family_name', 'parcel_type']
    ordering_fields = ['date_distributed']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# COMMUNITY OUTREACH VIEWSET
# ============================================
class CommunityOutreachViewSet(viewsets.ModelViewSet):
    queryset = CommunityOutreach.objects.all()
    serializer_class = CommunityOutreachSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['activity_name', 'location']
    ordering_fields = ['date', 'participants']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# MEETING VIEWSET
# ============================================
class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['meeting_type']
    search_fields = ['minutes', 'decisions', 'location']
    ordering_fields = ['date']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# CHALLENGE VIEWSET
# ============================================
class ChallengeViewSet(viewsets.ModelViewSet):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['resolved', 'related_module']
    ordering_fields = ['date']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# SUCCESS STORY VIEWSET
# ============================================
class SuccessStoryViewSet(viewsets.ModelViewSet):
    queryset = SuccessStory.objects.all()
    serializer_class = SuccessStorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'child__full_name']
    filterset_fields = ['featured', 'child']
    ordering_fields = ['date_recorded']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)





# ============================================
# SAFEGUARDING INCIDENT VIEWSET
# ============================================
class SafeguardingIncidentViewSet(viewsets.ModelViewSet):
    queryset = SafeguardingIncident.objects.all()
    serializer_class = SafeguardingIncidentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['incident_type', 'status']
    search_fields = ['description', 'action_taken']
    ordering_fields = ['date_of_incident']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# FEEDBACK VIEWSET
# ============================================
class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['channel', 'is_resolved']
    search_fields = ['description', 'resolution']
    ordering_fields = ['date_received']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProgramManager()]
        return [IsAuthenticated(), IsViewer()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ============================================
# DASHBOARD VIEW
# ============================================
class DashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        children = Child.objects.all()
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Basic stats
        data = {
            'total_children': children.count(),
            'active_children': children.filter(status='ACTIVE').count(),
            'children_by_gender': children.values('gender').annotate(count=Count('id')),
            'children_by_disability': children.values('disability_type').annotate(count=Count('id')),
            'children_by_district': children.values('district').annotate(count=Count('id')),
            'children_by_severity': children.values('severity').annotate(count=Count('id')),
            
            # Outreach stats
            'outreach_clinics': {
                'total': OutreachClinic.objects.count(),
                'this_month': OutreachClinic.objects.filter(date__gte=month_ago).count(),
                'this_week': OutreachClinic.objects.filter(date__gte=week_ago).count(),
                'average_attendance': OutreachClinic.objects.aggregate(avg=Avg('number_attended'))['avg'] or 0,
                'total_attended': OutreachClinic.objects.aggregate(total=Sum('number_attended'))['total'] or 0,
            },
            
            # Therapy stats
            'therapy': {
                'total_sessions': TherapySession.objects.count(),
                'this_month': TherapySession.objects.filter(date__gte=month_ago).count(),
                'total_hours': TherapySession.objects.aggregate(total=Sum('hours'))['total'] or 0,
                'children_receiving': TherapySession.objects.values('child').distinct().count(),
                'by_type': TherapySession.objects.values('therapy_type').annotate(count=Count('id')),
            },
            
            # Assessment stats
            'assessments': {
                'total': Assessment.objects.count(),
                'this_month': Assessment.objects.filter(date__gte=month_ago).count(),
                'by_type': Assessment.objects.values('assessment_type').annotate(count=Count('id')),
            },
            
            # Device stats
            'devices': {
                'total': AssistiveDevice.objects.count(),
                'sensory_total': SensoryDevice.objects.count(),
                'by_condition': AssistiveDevice.objects.values('condition').annotate(count=Count('id')),
            },
            
            # Training stats
            'training': {
                'total_workshops': CaregiverTraining.objects.count(),
                'caregivers_trained': CaregiverTraining.objects.aggregate(total=Sum('attendance'))['total'] or 0,
                'materials_distributed': EducationalMaterial.objects.aggregate(total=Sum('quantity'))['total'] or 0,
                'this_month': CaregiverTraining.objects.filter(date__gte=month_ago).count(),
            },
            
            # Nutrition stats
            'nutrition': {
                'assessments': NutritionSupport.objects.count(),
                'children_supported': NutritionSupport.objects.values('child').distinct().count(),
                'food_parcels_delivered': FoodParcel.objects.aggregate(total=Sum('quantity'))['total'] or 0,
                'families_supported': FoodParcel.objects.values('family_name').distinct().count(),
            },
            
            # Community stats
            'community': {
                'outreach_activities': CommunityOutreach.objects.count(),
                'total_participants': CommunityOutreach.objects.aggregate(total=Sum('participants'))['total'] or 0,
                'meetings': Meeting.objects.count(),
            },
            'referrals': {
                'total': Referral.objects.count(),
                'children_referred': Referral.objects.values('child').distinct().count(),
                'pending': Referral.objects.filter(status='PENDING').count(),
                'completed': Referral.objects.filter(status='COMPLETED').count(),
            },
            
            # Challenges and Success
            'challenges': {
                'total': Challenge.objects.count(),
                'unresolved': Challenge.objects.filter(resolved=False).count(),
                'resolved': Challenge.objects.filter(resolved=True).count(),
            },
            'success_stories': SuccessStory.objects.count(),
            'featured_stories': SuccessStory.objects.filter(featured=True).count(),
            

            
            # Recent records
            'recent_children': ChildSerializer(children.order_by('-created_at')[:10], many=True).data,
            'recent_activities': self.get_recent_activities(),
        }
        
        return Response(data)
    
    def get_recent_activities(self):
        """Get recent activities from various modules."""
        activities = []
        
        # Recent outreach clinics
        clinics = OutreachClinic.objects.order_by('-date')[:5]
        for clinic in clinics:
            activities.append({
                'type': 'outreach',
                'title': f"Outreach Clinic - {clinic.venue}",
                'date': clinic.date,
                'description': f"{clinic.number_attended} children attended",
            })
        
        # Recent therapy sessions
        sessions = TherapySession.objects.order_by('-date')[:5]
        for session in sessions:
            activities.append({
                'type': 'therapy',
                'title': f"Therapy Session - {session.child.full_name}",
                'date': session.date,
                'description': f"{session.therapy_type} - {session.hours} hours",
            })
        
        # Recent assessments
        assessments = Assessment.objects.order_by('-date')[:5]
        for assessment in assessments:
            activities.append({
                'type': 'assessment',
                'title': f"Assessment - {assessment.child.full_name}",
                'date': assessment.date,
                'description': f"{assessment.assessment_type}",
            })
        
        # Recent trainings
        trainings = CaregiverTraining.objects.order_by('-date')[:5]
        for training in trainings:
            activities.append({
                'type': 'training',
                'title': f"Training - {training.workshop_name}",
                'date': training.date,
                'description': f"{training.attendance} caregivers attended",
            })
        
        # Sort by date and limit
        activities.sort(key=lambda x: x['date'], reverse=True)
        return activities[:10]


# ============================================
# REPORT GENERATION VIEW
# ============================================
class FinalReportViewSet(viewsets.ModelViewSet):
    queryset = FinalReport.objects.all().order_by('-generated_at')
    serializer_class = FinalReportSerializer
    permission_classes = [IsAuthenticated, CanGenerateReports]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class ReportView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, CanGenerateReports]
    
    def post(self, request):
        report_type = request.data.get('report_type', 'summary')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        modules = request.data.get('modules', [])
        format_type = request.data.get('format', 'json')
        
        if not modules:
            return Response(
                {'error': 'At least one module is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Build report data
        report_data = {
            'generated_at': timezone.now().isoformat(),
            'report_type': report_type,
            'start_date': start_date,
            'end_date': end_date,
            'organization': 'BK Community Initiative',
            'title': f"{report_type.title()} Report",
            'editable': True,
            'can_download': True,
            'data': {}
        }
        
        # Module mapping for models
        module_models = {
            'children': {'model': Child, 'serializer': ChildSerializer},
            'outreach': {'model': OutreachClinic, 'serializer': OutreachClinicSerializer},
            'assessments': {'model': Assessment, 'serializer': AssessmentSerializer},
            'therapy': {'model': TherapySession, 'serializer': TherapySessionSerializer},
            'devices': {'model': AssistiveDevice, 'serializer': AssistiveDeviceSerializer},
            'sensory_devices': {'model': SensoryDevice, 'serializer': SensoryDeviceSerializer},
            'training': {'model': CaregiverTraining, 'serializer': CaregiverTrainingSerializer},
            'materials': {'model': EducationalMaterial, 'serializer': EducationalMaterialSerializer},
            'nutrition': {'model': NutritionSupport, 'serializer': NutritionSupportSerializer},
            'food_parcels': {'model': FoodParcel, 'serializer': FoodParcelSerializer},
            'community_outreach': {'model': CommunityOutreach, 'serializer': CommunityOutreachSerializer},
            'meetings': {'model': Meeting, 'serializer': MeetingSerializer},
            'challenges': {'model': Challenge, 'serializer': ChallengeSerializer},
            'success_stories': {'model': SuccessStory, 'serializer': SuccessStorySerializer},

            'safeguarding': {'model': SafeguardingIncident, 'serializer': SafeguardingIncidentSerializer},
            'feedback': {'model': Feedback, 'serializer': FeedbackSerializer},
        }
        
        # Include requested modules
        for module in modules:
            if module in module_models:
                model_info = module_models[module]
                queryset = model_info['model'].objects.all()
                
                date_field = self.get_date_field(model_info['model'])
                if date_field and start_date:
                    queryset = queryset.filter(**{f"{date_field}__gte": start_date})
                if date_field and end_date:
                    queryset = queryset.filter(**{f"{date_field}__lte": end_date})
                
                serializer = model_info['serializer'](queryset, many=True)
                report_data['data'][module] = {
                    'total': queryset.count(),
                    'records': serializer.data
                }

        if format_type == 'json':
            return Response(report_data)

        if format_type not in ['excel', 'xlsx', 'word', 'docx', 'pdf']:
            return Response(
                {'error': 'Unsupported report format.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        filename_safe = report_data['title'].replace(' ', '_').lower()

        if format_type in ['excel', 'xlsx']:
            workbook = Workbook()
            worksheet = workbook.active
            worksheet.title = 'Report'

            worksheet.append([report_data['title']])
            worksheet.append([])
            worksheet.append(['Generated At', report_data['generated_at']])
            worksheet.append(['Report Type', report_data['report_type']])
            worksheet.append(['Start Date', report_data['start_date'] or 'N/A'])
            worksheet.append(['End Date', report_data['end_date'] or 'N/A'])
            worksheet.append([])

            for module_name, module_data in report_data['data'].items():
                worksheet.append([module_name.upper()])
                worksheet.append(['Total', module_data['total']])
                worksheet.append([])
                records = module_data.get('records', [])
                if records:
                    headers = list(records[0].keys()) if records else []
                    worksheet.append(headers)
                    for record in records:
                        worksheet.append([str(record.get(k, '')) for k in headers])
                worksheet.append([])

            output = BytesIO()
            workbook.save(output)
            output.seek(0)
            response = HttpResponse(output.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename={filename_safe}.xlsx'
            return response

        if format_type in ['word', 'docx']:
            document = Document()
            document.add_heading(report_data['title'], 0)
            document.add_paragraph(f"Generated At: {report_data['generated_at']}")
            document.add_paragraph(f"Report Type: {report_data['report_type']}")
            document.add_paragraph(f"Date Range: {report_data['start_date'] or 'N/A'} to {report_data['end_date'] or 'N/A'}")
            document.add_paragraph('')

            for module_name, module_data in report_data['data'].items():
                document.add_heading(module_name.replace('_', ' ').title(), level=1)
                document.add_paragraph(f"Total: {module_data['total']}")
                records = module_data.get('records', [])
                if records:
                    headers = list(records[0].keys()) if records else []
                    table = document.add_table(rows=1, cols=len(headers))
                    hdr_cells = table.rows[0].cells
                    for idx, header in enumerate(headers):
                        hdr_cells[idx].text = header.replace('_', ' ').title()
                    for record in records:
                        row_cells = table.add_row().cells
                        for idx, key in enumerate(headers):
                            row_cells[idx].text = str(record.get(key, ''))
                document.add_paragraph('')

            output = BytesIO()
            document.save(output)
            output.seek(0)
            response = HttpResponse(output.getvalue(), content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            response['Content-Disposition'] = f'attachment; filename={filename_safe}.docx'
            return response

        if format_type == 'pdf':
            output = BytesIO()
            doc = SimpleDocTemplate(output, pagesize=letter)
            styles = getSampleStyleSheet()
            story = [Paragraph(report_data['title'], styles['Title'])]
            story.append(Paragraph(f"Generated At: {report_data['generated_at']}", styles['Normal']))
            story.append(Paragraph(f"Report Type: {report_data['report_type']}", styles['Normal']))
            story.append(Paragraph(f"Date Range: {report_data['start_date'] or 'N/A'} to {report_data['end_date'] or 'N/A'}", styles['Normal']))
            story.append(Spacer(1, 12))

            for module_name, module_data in report_data['data'].items():
                story.append(Paragraph(module_name.replace('_', ' ').title(), styles['Heading2']))
                story.append(Paragraph(f"Total: {module_data['total']}", styles['Normal']))
                records = module_data.get('records', [])
                if records:
                    for record in records[:20]:
                        story.append(Paragraph(str(record), styles['Normal']))
                    if len(records) > 20:
                        story.append(Paragraph(f"... and {len(records) - 20} more records", styles['Normal']))
                story.append(Spacer(1, 12))

            doc.build(story)
            output.seek(0)
            response = HttpResponse(output.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename={filename_safe}.pdf'
            return response
    
    def get_date_field(self, model):
        """Get the default date field for each model."""
        date_fields = {
            Child: 'created_at',
            OutreachClinic: 'date',
            Assessment: 'date',
            TherapySession: 'date',
            AssistiveDevice: 'date_issued',
            SensoryDevice: 'date_distributed',
            CaregiverTraining: 'date',
            EducationalMaterial: 'date_distributed',
            NutritionSupport: 'assessment_date',
            FoodParcel: 'date_distributed',
            CommunityOutreach: 'date',
            Meeting: 'date',
            Challenge: 'date',
            SuccessStory: 'date_recorded',

            SafeguardingIncident: 'date_of_incident',
            Feedback: 'date_received',
        }
        return date_fields.get(model)


# ============================================
# PROFILE VIEW
# ============================================
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        user.email = request.data.get('email', user.email)
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        if 'phone' in request.data:
            profile.phone = request.data.get('phone')
        if 'department' in request.data:
            profile.department = request.data.get('department')
            
        if 'photo' in request.FILES:
            profile.photo = request.FILES['photo']
        elif 'photo' in request.data and not request.data.get('photo'):
            profile.photo = None
            
        profile.save()

        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)


# ============================================
# ========== NEW AI CHAT VIEWS ==============
# ============================================

# ============================================
# AI CHAT VIEW (General Questions)
# ============================================
class ChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get('question', '')
        provider_name = request.data.get('provider')  # optional

        if not question:
            return Response({"error": "Question is required."}, status=status.HTTP_400_BAD_REQUEST)

        system_msg = self.build_system_message(request.user, question)

        try:
            result = ai_manager.generate(
                prompt=question,
                system_message=system_msg,
                max_tokens=4000,
                temperature=0.7,
                provider_name=provider_name,
            )
            return Response({
                "answer": result["response"],
                "provider_used": result["provider_used"],
                "available_providers": ai_manager.get_available_providers(),
            })
        except Exception as e:
            return Response({
                "error": str(e),
                "available_providers": ai_manager.get_available_providers(),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def build_system_message(self, user, question):
        counts = {
            'Total Children': Child.objects.count(),
            'Active Children': Child.objects.filter(status='ACTIVE').count(),
            'Referrals': Referral.objects.count(),
            'Documents': Document.objects.count(),
            'Outreach Clinics': OutreachClinic.objects.count(),
            'Assessments': Assessment.objects.count(),
            'Therapy Sessions': TherapySession.objects.count(),
            'Assistive Devices': AssistiveDevice.objects.count(),
            'Sensory Devices': SensoryDevice.objects.count(),
            'Caregiver Trainings': CaregiverTraining.objects.count(),
            'Educational Materials': EducationalMaterial.objects.count(),
            'Nutrition Support Records': NutritionSupport.objects.count(),
            'Food Parcels': FoodParcel.objects.count(),
            'Community Outreach Activities': CommunityOutreach.objects.count(),
            'Meetings': Meeting.objects.count(),
            'Challenges': Challenge.objects.count(),
            'Success Stories': SuccessStory.objects.count(),
            'Safeguarding Incidents': SafeguardingIncident.objects.count(),
            'Feedback Records': Feedback.objects.count(),
        }

        counts_text = ", ".join([f"{k}: {v}" for k, v in counts.items()])
        permissions_text = self.build_permissions_text(user)
        entity_context = self.build_entity_context(question)

        return (
            f"You are an expert M&E assistant for a disability and child support program in Uganda.\n"
            f"Here is the live system data (all modules):\n{counts_text}\n\n"
            f"Assistant access policy: FULL ACCESS to all modules and all live records for question answering and reporting.\n"
            f"Current user access: {permissions_text}\n\n"
            f"Relevant live records:\n{entity_context}\n\n"
            f"RULES FOR ANSWERING:\n"
            f"1. For general chat questions, be concise and helpful.\n"
            f"2. For questions about a specific child or person, search the live child records first and answer from the matched record when available.\n"
            f"3. If no exact record exists, clearly say that no matching child/person was found in the current system instead of guessing.\n"
            f"4. IF the user asks for a 'report', you MUST generate a comprehensive, highly detailed report equivalent to 3-4 pages of a Word document.\n"
            f"5. In reports, use professional formatting: include standard Markdown tables, blockquotes (>) for callout blocks, and **bold** all key figures.\n"
            f"6. NEVER use ASCII art, text boxes, or raw text lines like `+------`, `|---`, or `\\ |` for formatting. Use standard Markdown ONLY.\n"
            f"7. Ensure ALL numbers strictly match the provided live system data.\n"
            f"8. Expand narrative sections thoroughly and analytically based on the available data without adding fluff to meet the length requirement."
        )

    def build_permissions_text(self, user):
        permissions = _build_user_permissions(user)
        if not permissions:
            return 'No permissions assigned.'

        permission_items = []
        for permission in permissions:
            permission_items.append(f"{permission['module']}:{permission['action']}")

        return ", ".join(permission_items)

    def build_entity_context(self, question):
        # Try to find matches across children, users (staff), and outreach places
        child_matches = self.find_child_matches(question)
        user_matches = self.find_user_matches(question)
        outreach_matches = self.find_outreach_matches(question)

        lines = []

        if child_matches:
            lines.append("Matched children:")
            for child in child_matches:
                referrals = child.referrals.count()
                assessments = child.assessments.count()
                therapy_sessions = child.therapy_sessions.count()
                total_therapy_hours = sum(session.hours or 0 for session in child.therapy_sessions.all())
                devices = child.devices.count()
                nutrition_records = child.nutrition_records.count()
                success_stories = child.success_stories.count()
                age = self.calculate_age(child.date_of_birth) if child.date_of_birth else 'N/A'
                gender = child.get_gender_display() if hasattr(child, 'get_gender_display') else child.gender or 'N/A'
                lines.append(
                    f"- {child.full_name} ({child.child_id}): status={child.status}, gender={gender}, age={age}, district={child.district}, village={child.village}, disability={child.disability_type or 'N/A'}, caregiver={child.caregiver_name}, referrals={referrals}, assessments={assessments}, therapy_sessions={therapy_sessions}, therapy_hours={total_therapy_hours}, devices={devices}, nutrition_records={nutrition_records}, success_stories={success_stories}"
                )

        if user_matches:
            lines.append("Matched users/staff:")
            for user in user_matches:
                phone = user.profile.phone if hasattr(user, 'profile') else ''
                dept = user.profile.department if hasattr(user, 'profile') else ''
                role = 'Administrator' if user.is_superuser else (list(user.groups.values_list('name', flat=True))[0] if user.groups.exists() else 'User')
                lines.append(f"- {user.get_full_name() or user.username}: username={user.username}, email={user.email or 'N/A'}, phone={phone or 'N/A'}, role={role}, department={dept or 'N/A'}")

        if outreach_matches:
            lines.append("Matched places / outreach clinics:")
            for clinic in outreach_matches:
                # Attempt to summarize staff involved list and attached counts
                staff = clinic.staff_involved or ''
                attendees = clinic.number_attended or 0
                date = clinic.date.isoformat() if clinic.date else 'N/A'
                # attach counts of related children if applicable
                lines.append(f"- Outreach: {clinic.venue or 'Venue'} ({clinic.district}, {clinic.village}) on {date}: staff={staff or 'N/A'}, attendees={attendees}")

        if lines:
            return "\n".join(lines)

        # Fallback: show recent children and a few recent clinics/users
        recent_children = Child.objects.order_by('-created_at')[:5]
        recent_clinics = OutreachClinic.objects.order_by('-date')[:5]
        recent_users = User.objects.order_by('-date_joined')[:5]

        if recent_children or recent_clinics or recent_users:
            lines = ["Recent records:"]
            for child in recent_children:
                age = self.calculate_age(child.date_of_birth) if child.date_of_birth else 'N/A'
                gender = child.get_gender_display() if hasattr(child, 'get_gender_display') else child.gender or 'N/A'
                lines.append(f"- Child: {child.full_name} ({child.child_id}): status={child.status}, gender={gender}, age={age}, district={child.district}, village={child.village}")
            for clinic in recent_clinics:
                lines.append(f"- Outreach: {clinic.venue or 'Venue'} ({clinic.district}, {clinic.village}) on {clinic.date.isoformat() if clinic.date else 'N/A'}")
            for user in recent_users:
                lines.append(f"- User: {user.get_full_name() or user.username} ({user.username})")
            return "\n".join(lines)

        return "No matching records found in the system yet."

    def find_child_matches(self, question):
        terms = re.findall(r"[A-Za-z0-9][A-Za-z0-9_\-]{2,}", question)
        stop_words = {
            'about', 'access', 'all', 'and', 'any', 'are', 'assistant', 'can', 'child', 'children', 'current',
            'data', 'details', 'did', 'do', 'find', 'for', 'give', 'help', 'how', 'info', 'information',
            'is', 'list', 'me', 'my', 'of', 'program', 'registered', 'show', 'system', 'tell', 'the', 'this',
            'to', 'user', 'who', 'with', 'you'
        }
        search_terms = [term for term in terms if term.lower() not in stop_words]
        if not search_terms:
            return []

        query = Q()
        for term in search_terms[:5]:
            query |= Q(full_name__icontains=term) | Q(child_id__icontains=term) | Q(village__icontains=term) | Q(district__icontains=term)

        return list(Child.objects.filter(query).distinct()[:5])

    def find_user_matches(self, question):
        terms = re.findall(r"[A-Za-z0-9][A-Za-z0-9_\-]{2,}", question)
        stop_words = {'about','access','all','and','any','are','assistant','can','child','children','current','data','details','did','do','find','for','give','help','how','info','information','is','list','me','my','of','program','registered','show','system','tell','the','this','to','user','who','with','you'}
        search_terms = [t for t in terms if t.lower() not in stop_words]
        if not search_terms:
            return []

        query = Q()
        for term in search_terms[:5]:
            query |= Q(username__icontains=term) | Q(first_name__icontains=term) | Q(last_name__icontains=term) | Q(email__icontains=term)

        return list(User.objects.filter(query).distinct()[:5])

    def find_outreach_matches(self, question):
        terms = re.findall(r"[A-Za-z0-9][A-Za-z0-9_\-]{2,}", question)
        stop_words = {'about','access','all','and','any','are','assistant','can','child','children','current','data','details','did','do','find','for','give','help','how','info','information','is','list','me','my','of','program','registered','show','system','tell','the','this','to','user','who','with','you'}
        search_terms = [t for t in terms if t.lower() not in stop_words]
        if not search_terms:
            return []

        query = Q()
        for term in search_terms[:5]:
            query |= Q(venue__icontains=term) | Q(staff_involved__icontains=term) | Q(village__icontains=term) | Q(district__icontains=term)

        return list(OutreachClinic.objects.filter(query).distinct()[:5])

    def calculate_age(self, dob):
        today = timezone.now().date()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


# ============================================
# AI REPORT GENERATION VIEW
# ============================================
class ChatReportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        prompt = request.data.get('prompt', '')
        period = request.data.get('period', {})
        provider_name = request.data.get('provider')  # optional

        start = period.get('start')
        end = period.get('end')

        # If no period given, default to last 90 days
        if not start or not end:
            end_date = datetime.today()
            start_date = end_date - timedelta(days=90)
            start = start_date.strftime('%Y-%m-%d')
            end = end_date.strftime('%Y-%m-%d')
            period = {"start": start, "end": end}

        # Fetch aggregated data
        data = self.get_report_data(start, end)

        # Build prompt for AI
        report_prompt = f"""
You are an M&E report writer for a disability and child support program in Uganda.

Write a narrative report based on the following data for the period {period['start']} to {period['end']}.

Data summary:
- Total children enrolled: {data['children']['total']}
- Active children: {data['children']['active']}
- New children: {data['children']['new']}
- Assessments conducted: {data['assessments']}
- Therapy sessions: {data['therapy']['total_sessions']}
- Therapy hours: {data['therapy']['total_hours'] or 0}
- Outreach clinics: {data['outreach']}
- Nutrition support provided: {data['nutrition']}
- Assistive devices distributed: {data['devices']}
- Caregiver training sessions: {data['training']}
- Community outreach activities: {data['community']}
- Meetings held: {data['meetings']}
- Success stories: {data['success_stories']}
- Challenges: {data['challenges']}

Write a professional report with:
1. Introduction
2. Key Achievements
3. Program Activities
4. Challenges
5. Recommendations
6. Conclusion

Use a positive, factual tone. Include specific numbers. Around 500-700 words.
"""

        try:
            result = ai_manager.generate(
                prompt=report_prompt,
                system_message="You are a professional M&E report writer. Write clear, factual, and well-structured reports.",
                max_tokens=1500,
                temperature=0.7,
                provider_name=provider_name,
            )
            return Response({
                "report": result["response"],
                "provider_used": result["provider_used"],
                "available_providers": ai_manager.get_available_providers(),
                "data": data,
                "period": period,
            })
        except Exception as e:
            return Response({
                "error": str(e),
                "available_providers": ai_manager.get_available_providers(),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_report_data(self, start, end):
        """Aggregate data from models for the date range."""
        data = {
            "period": f"{start} to {end}",
            "children": {
                "total": Child.objects.filter(created_at__range=(start, end)).count(),
                "active": Child.objects.filter(status='ACTIVE', created_at__range=(start, end)).count(),
                "new": Child.objects.filter(created_at__range=(start, end)).count(),
            },
            "assessments": Assessment.objects.filter(date__range=(start, end)).count(),
            "therapy": TherapySession.objects.filter(date__range=(start, end)).aggregate(
                total_sessions=Count('id'),
                total_hours=Sum('hours')
            ),
            "outreach": OutreachClinic.objects.filter(date__range=(start, end)).count(),
            "nutrition": NutritionSupport.objects.filter(assessment_date__range=(start, end)).count(),
            "devices": AssistiveDevice.objects.filter(date_issued__range=(start, end)).count(),
            "training": CaregiverTraining.objects.filter(date__range=(start, end)).count(),
            "community": CommunityOutreach.objects.filter(date__range=(start, end)).count(),
            "meetings": Meeting.objects.filter(date__range=(start, end)).count(),
            "success_stories": SuccessStory.objects.filter(date_recorded__range=(start, end)).count(),
            "challenges": Challenge.objects.filter(date__range=(start, end)).count(),
        }
        return data


# ============================================
# AI PROVIDERS LIST VIEW
# ============================================
class AIProvidersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "available_providers": ai_manager.get_available_providers(),
        })