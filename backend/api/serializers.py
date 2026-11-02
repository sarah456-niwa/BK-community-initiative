from rest_framework import serializers
from django.contrib.auth.models import User, Group
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from .models import *

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    sub_role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'role', 'phone', 'department', 'photo', 'sub_role']
        read_only_fields = ['id']

    def get_role(self, obj):
        if obj.is_superuser:
            return 'Administrator'
        group_names = list(obj.groups.values_list('name', flat=True))
        return group_names[0] if group_names else 'User'

    def get_phone(self, obj):
        return obj.profile.phone if hasattr(obj, 'profile') else ''

    def get_department(self, obj):
        return obj.profile.department if hasattr(obj, 'profile') else ''

    def get_photo(self, obj):
        if hasattr(obj, 'profile') and obj.profile.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile.photo.url)
            return obj.profile.photo.url
        return None

    def get_sub_role(self, obj):
        return obj.profile.sub_role if hasattr(obj, 'profile') else ''

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=False)
    role = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    department = serializers.CharField(write_only=True, required=False, allow_blank=True)
    sub_role = serializers.CharField(write_only=True, required=False, allow_blank=True)
    photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'password2', 'email', 'first_name', 'last_name', 'is_staff', 'role', 'phone', 'department', 'sub_role', 'photo']

    def validate(self, attrs):
        if 'password' in attrs or 'password2' in attrs:
            if attrs.get('password') != attrs.get('password2'):
                raise serializers.ValidationError({"password": "Password fields didn't match."})
        role = attrs.get('role', '')
        if role and role not in ['Administrator', 'Executive Director', 'Executive Officer', 'Program Manager', 'M&E Personnel', 'M&E Officer', 'Therapist', 'Nutrition Officer', 'Community Outreach Officer', 'Caregiver Trainer', 'Guest', 'Volunteer']:
            raise serializers.ValidationError({"role": "Invalid role selected."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('password2', None)
        role = validated_data.pop('role', '')
        is_staff = validated_data.pop('is_staff', False)
        phone = validated_data.pop('phone', '')
        department = validated_data.pop('department', '')
        sub_role = validated_data.pop('sub_role', '')
        photo = validated_data.pop('photo', None)

        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()

        if role:
            group, _ = Group.objects.get_or_create(name=role)
            user.groups.add(group)
        if role or is_staff:
            user.is_staff = True
            user.save(update_fields=['is_staff'])

        # Profile gets automatically created via signals
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.phone = phone
        profile.department = department
        profile.sub_role = sub_role
        if photo:
            profile.photo = photo
        profile.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('password2', None)
        role = validated_data.pop('role', None)
        phone = validated_data.pop('phone', None)
        department = validated_data.pop('department', None)
        sub_role = validated_data.pop('sub_role', None)
        photo = validated_data.pop('photo', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()

        if role is not None:
            instance.groups.clear()
            if role:
                group, _ = Group.objects.get_or_create(name=role)
                instance.groups.add(group)
                instance.is_staff = True
                instance.save(update_fields=['is_staff'])

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if phone is not None:
            profile.phone = phone
        if department is not None:
            profile.department = department
        if sub_role is not None:
            profile.sub_role = sub_role
        if photo is not None:
            profile.photo = photo
        profile.save()
        return instance

class ChildSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    full_name_display = serializers.SerializerMethodField()
    therapist_name = serializers.SerializerMethodField()
    last_activity_date = serializers.SerializerMethodField()
    days_inactive = serializers.SerializerMethodField()
    
    class Meta:
        model = Child
        fields = '__all__'
        read_only_fields = ['id', 'child_id', 'created_at', 'updated_at']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
        }
    
    def get_age(self, obj):
        if obj.date_of_birth:
            today = timezone.now().date()
            return today.year - obj.date_of_birth.year - ((today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day))
        return None
    
    def get_full_name_display(self, obj):
        return f"{obj.child_id} - {obj.full_name}"
    
    def get_last_activity_date(self, obj):
        from .inactivity_service import get_child_last_activity_date
        d = get_child_last_activity_date(obj)
        return d.isoformat() if d else None

    def get_days_inactive(self, obj):
        from .inactivity_service import get_child_last_activity_datetime, TEST_INACTIVITY_MINUTES
        dt = get_child_last_activity_datetime(obj)
        if dt:
            now = timezone.now()
            if TEST_INACTIVITY_MINUTES is not None:
                return max(0, int((now - dt).total_seconds() // 60))
            return max(0, (now.date() - dt.date()).days)
        return 0

    def get_therapist_name(self, obj):
        if obj.therapist_assigned:
            return f"{obj.therapist_assigned.first_name} {obj.therapist_assigned.last_name}"
        return None

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

class OutreachClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = OutreachClinic
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

class AssessmentSerializer(serializers.ModelSerializer):
    child_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Assessment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    def get_child_name(self, obj):
        return obj.child.full_name if obj.child else None

class TherapySessionSerializer(serializers.ModelSerializer):
    child_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TherapySession
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    def get_child_name(self, obj):
        return obj.child.full_name if obj.child else None

class AssistiveDeviceSerializer(serializers.ModelSerializer):
    child_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AssistiveDevice
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    def get_child_name(self, obj):
        return obj.child.full_name if obj.child else None

class SensoryDeviceSerializer(serializers.ModelSerializer):
    child_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SensoryDevice
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    def get_child_name(self, obj):
        return obj.child.full_name if obj.child else None

class CaregiverTrainingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaregiverTraining
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

class EducationalMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationalMaterial
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

class NutritionSupportSerializer(serializers.ModelSerializer):
    child_name = serializers.SerializerMethodField()
    
    class Meta:
        model = NutritionSupport
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    def get_child_name(self, obj):
        return obj.child.full_name if obj.child else None

class FoodParcelSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodParcel
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

class CommunityOutreachSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityOutreach
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

class ReferralSerializer(serializers.ModelSerializer):
    child_name = serializers.SerializerMethodField()

    class Meta:
        model = Referral
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

    def get_child_name(self, obj):
        return f"{obj.child.full_name}" if obj.child else None

class MeetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

class ChallengeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Challenge
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

class SuccessStorySerializer(serializers.ModelSerializer):
    child_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SuccessStory
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    def get_child_name(self, obj):
        return obj.child.full_name if obj.child else None

class SafeguardingIncidentSerializer(serializers.ModelSerializer):
    child_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SafeguardingIncident
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
        
    def get_child_name(self, obj):
        return obj.child.full_name if obj.child else None

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

class FinalReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinalReport
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

class NotificationSerializer(serializers.ModelSerializer):
    child_name = serializers.SerializerMethodField()
    child_case_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

    def get_child_name(self, obj):
        return obj.child.full_name if obj.child else None

    def get_child_case_id(self, obj):
        return obj.child.child_id if obj.child else None
