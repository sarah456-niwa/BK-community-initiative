from django.contrib import admin
from .models import *

@admin.register(Child)
class ChildAdmin(admin.ModelAdmin):
    list_display = ['child_id', 'full_name', 'disability_type', 'district', 'status', 'enrollment_date']
    search_fields = ['full_name', 'child_id', 'caregiver_name', 'village']
    list_filter = ['status', 'gender', 'disability_type', 'district', 'severity']
    readonly_fields = ['child_id', 'created_at', 'updated_at']
    fieldsets = (
        ('Personal Information', {
            'fields': ('child_id', 'full_name', 'photo', 'date_of_birth', 'gender', 
                      'disability_type', 'severity', 'diagnosis', 'school')
        }),
        ('Caregiver Information', {
            'fields': ('caregiver_name', 'caregiver_phone', 'caregiver_email', 'caregiver_relationship')
        }),
        ('Address', {
            'fields': ('address', 'village', 'district', 'gps_coordinates')
        }),
        ('Medical Information', {
            'fields': ('medical_history', 'current_medication', 'allergies')
        }),
        ('Program Information', {
            'fields': ('therapist_assigned', 'status', 'enrollment_date')
        }),
        ('M&E and Safeguarding', {
            'fields': ('consent_given', 'consent_date', 'discharge_reason', 'discharge_date', 'exit_destination')
        }),
        ('Additional Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

@admin.register(OutreachClinic)
class OutreachClinicAdmin(admin.ModelAdmin):
    list_display = ['date', 'district', 'village', 'venue', 'number_attended']
    list_filter = ['district', 'date']
    search_fields = ['venue', 'village', 'district']

@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ['child', 'date', 'assessment_type', 'therapist']
    list_filter = ['assessment_type', 'date']
    search_fields = ['child__full_name', 'findings']

@admin.register(TherapySession)
class TherapySessionAdmin(admin.ModelAdmin):
    list_display = ['child', 'date', 'therapy_type', 'hours', 'therapist']
    list_filter = ['therapy_type', 'date']
    search_fields = ['child__full_name']

@admin.register(AssistiveDevice)
class AssistiveDeviceAdmin(admin.ModelAdmin):
    list_display = ['child', 'device_type', 'date_issued', 'condition']
    list_filter = ['condition', 'device_type']
    search_fields = ['serial_number', 'device_type']

@admin.register(SensoryDevice)
class SensoryDeviceAdmin(admin.ModelAdmin):
    list_display = ['child', 'device_name', 'quantity', 'date_distributed']
    search_fields = ['device_name']

@admin.register(CaregiverTraining)
class CaregiverTrainingAdmin(admin.ModelAdmin):
    list_display = ['workshop_name', 'date', 'trainer', 'attendance']
    search_fields = ['workshop_name', 'trainer']
    list_filter = ['date']

@admin.register(EducationalMaterial)
class EducationalMaterialAdmin(admin.ModelAdmin):
    list_display = ['material_name', 'quantity', 'date_distributed', 'recipient']
    search_fields = ['material_name', 'recipient']

@admin.register(NutritionSupport)
class NutritionSupportAdmin(admin.ModelAdmin):
    list_display = ['child', 'assessment_date', 'nutrition_status']
    search_fields = ['child__full_name']

@admin.register(FoodParcel)
class FoodParcelAdmin(admin.ModelAdmin):
    list_display = ['family_name', 'parcel_type', 'date_distributed', 'quantity']
    search_fields = ['family_name']

@admin.register(CommunityOutreach)
class CommunityOutreachAdmin(admin.ModelAdmin):
    list_display = ['activity_name', 'date', 'location', 'participants']
    search_fields = ['activity_name', 'location']

@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ['meeting_type', 'date', 'participants']
    list_filter = ['meeting_type', 'date']

@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ['related_module', 'date', 'challenge_description', 'resolved']
    list_filter = ['resolved', 'date']

@admin.register(SuccessStory)
class SuccessStoryAdmin(admin.ModelAdmin):
    list_display = ['child', 'title', 'featured', 'date_recorded']
    search_fields = ['title', 'description']
    list_filter = ['featured', 'date_recorded']

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['child', 'document_type', 'title', 'uploaded_at']
    list_filter = ['document_type']

@admin.register(SafeguardingIncident)
class SafeguardingIncidentAdmin(admin.ModelAdmin):
    list_display = ['incident_type', 'date_of_incident', 'status', 'reported_by']
    list_filter = ['status', 'incident_type']

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ['date_received', 'channel', 'is_resolved']
    list_filter = ['is_resolved', 'channel']

