from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from ckeditor.fields import RichTextField
import uuid

class BaseModel(models.Model):
    """Abstract base model with common fields"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                   related_name='%(class)s_created')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                   related_name='%(class)s_updated')

    class Meta:
        abstract = True

# ============================================
# CHILD MODEL - Main beneficiary record
# ============================================
class Child(BaseModel):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('TRANSFERRED', 'Transferred'),
        ('DECEASED', 'Deceased'),
    ]
    
    SEVERITY_CHOICES = [
        ('MILD', 'Mild'),
        ('MODERATE', 'Moderate'),
        ('SEVERE', 'Severe'),
    ]

    # Personal Information
    child_id = models.CharField(max_length=20, unique=True, editable=False)
    full_name = models.CharField(max_length=200)
    photo = models.ImageField(upload_to='children/photos/', blank=True, null=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    disability_type = models.CharField(max_length=200, blank=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='MODERATE')
    diagnosis = models.TextField(blank=True)
    school = models.CharField(max_length=200, blank=True)
    referral_date = models.DateField(null=True, blank=True)
    referred_by = models.CharField(max_length=200, blank=True)
    referral_source = models.CharField(max_length=200, blank=True)
    referral_reason = models.TextField(blank=True)
    
    # Caregiver Information
    caregiver_name = models.CharField(max_length=200)
    caregiver_phone = models.CharField(max_length=20)
    caregiver_email = models.EmailField(blank=True)
    caregiver_relationship = models.CharField(max_length=50, blank=True)
    
    # Address
    address = models.TextField(blank=True)
    village = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    gps_coordinates = models.CharField(max_length=50, blank=True)
    
    # Medical Information
    medical_history = models.TextField(blank=True)
    current_medication = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    
    # Program Information
    therapist_assigned = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                          blank=True, related_name='assigned_children')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    enrollment_date = models.DateField(auto_now_add=True)
    
    # M&E / Safeguarding Information
    consent_given = models.BooleanField(default=False)
    consent_date = models.DateField(null=True, blank=True)
    discharge_reason = models.TextField(blank=True)
    discharge_date = models.DateField(null=True, blank=True)
    exit_destination = models.CharField(max_length=200, blank=True)
    
    # Additional Notes
    notes = models.TextField(blank=True)
    
    def save(self, *args, **kwargs):
        if not self.child_id:
            # Generate child ID: BK-CH-YYYY-XXXX
            year = timezone.now().year
            last_child = Child.objects.filter(child_id__startswith=f'BK-CH-{year}-').order_by('child_id').last()
            if last_child:
                last_num = int(last_child.child_id.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            self.child_id = f'BK-CH-{year}-{new_num:04d}'
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.child_id} - {self.full_name}"
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Children'

# ============================================
# REFERRALS
# ============================================
class Referral(BaseModel):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name='referrals')
    referral_date = models.DateField(null=True, blank=True)
    referred_by = models.CharField(max_length=200, blank=True)
    referral_source = models.CharField(max_length=200, blank=True)
    referral_reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Referral for {self.child.full_name} - {self.status}"

    class Meta:
        ordering = ['-referral_date', '-created_at']

# ============================================
# DOCUMENT MODEL
# ============================================
class Document(BaseModel):
    DOCUMENT_TYPES = [
        ('PHOTO', 'Photo'),
        ('REPORT', 'Report'),
        ('ASSESSMENT', 'Assessment'),
        ('MEDICAL', 'Medical Record'),
        ('THERAPY', 'Therapy Note'),
        ('OTHER', 'Other'),
    ]
    
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='children/documents/')
    description = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.title} - {self.child.full_name}"
    
    class Meta:
        ordering = ['-uploaded_at']

# ============================================
# OUTREACH CLINICS
# ============================================
class OutreachClinic(BaseModel):
    date = models.DateField()
    district = models.CharField(max_length=100)
    village = models.CharField(max_length=100)
    venue = models.CharField(max_length=200)
    staff_involved = models.TextField(help_text="Names and roles of staff members")
    number_attended = models.PositiveIntegerField(default=0)
    attendance_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.date} - {self.district} - {self.venue}"
    
    class Meta:
        ordering = ['-date']

# ============================================
# ASSESSMENTS
# ============================================
class Assessment(BaseModel):
    ASSESSMENT_TYPES = [
        ('PHYSICAL', 'Physical'),
        ('OCCUPATIONAL', 'Occupational'),
        ('SPEECH', 'Speech'),
        ('PSYCHOLOGICAL', 'Psychological'),
        ('DEVELOPMENTAL', 'Developmental'),
        ('EDUCATIONAL', 'Educational'),
        ('OTHER', 'Other'),
    ]
    
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name='assessments')
    date = models.DateField()
    therapist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    assessment_type = models.CharField(max_length=20, choices=ASSESSMENT_TYPES)
    findings = models.TextField()
    recommendations = models.TextField(blank=True)
    progress_report = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.child.full_name} - {self.assessment_type} - {self.date}"
    
    class Meta:
        ordering = ['-date']

# ============================================
# THERAPY SESSIONS
# ============================================
class TherapySession(BaseModel):
    THERAPY_TYPES = [
        ('PHYSIO', 'Physiotherapy'),
        ('SPEECH', 'Speech Therapy'),
        ('OCCUPATIONAL', 'Occupational Therapy'),
        ('BEHAVIORAL', 'Behavioral Therapy'),
        ('COGNITIVE', 'Cognitive Therapy'),
        ('OTHER', 'Other'),
    ]
    
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name='therapy_sessions')
    therapy_type = models.CharField(max_length=20, choices=THERAPY_TYPES)
    hours = models.DecimalField(max_digits=4, decimal_places=1, validators=[MinValueValidator(0)])
    therapist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    date = models.DateField()
    outcome = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.child.full_name} - {self.therapy_type} - {self.date}"
    
    class Meta:
        ordering = ['-date']

# ============================================
# ASSISTIVE DEVICES
# ============================================
class AssistiveDevice(BaseModel):
    CONDITION_CHOICES = [
        ('NEW', 'New'),
        ('GOOD', 'Good'),
        ('FAIR', 'Fair'),
        ('NEEDS_REPLACEMENT', 'Needs Replacement'),
    ]
    
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name='devices')
    device_type = models.CharField(max_length=100)
    date_issued = models.DateField()
    serial_number = models.CharField(max_length=50, unique=True, blank=True)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='NEW')
    replacement_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.device_type} - {self.child.full_name}"
    
    class Meta:
        ordering = ['-date_issued']

# ============================================
# SENSORY DEVICES
# ============================================
class SensoryDevice(BaseModel):
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name='sensory_devices')
    device_name = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=1)
    date_distributed = models.DateField()
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.device_name} x{self.quantity} - {self.child.full_name}"
    
    class Meta:
        ordering = ['-date_distributed']

# ============================================
# CAREGIVER TRAINING
# ============================================
class CaregiverTraining(BaseModel):
    workshop_name = models.CharField(max_length=200)
    date = models.DateField()
    trainer = models.CharField(max_length=200)
    attendance = models.PositiveIntegerField(default=0)
    topics = models.TextField()
    evaluation = models.TextField(blank=True)
    knowledge_improvement = models.TextField(blank=True)
    materials_distributed = models.PositiveIntegerField(default=0)
    
    def __str__(self):
        return f"{self.workshop_name} - {self.date}"
    
    class Meta:
        ordering = ['-date']

# ============================================
# EDUCATIONAL MATERIALS
# ============================================
class EducationalMaterial(BaseModel):
    material_name = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    date_distributed = models.DateField()
    recipient = models.CharField(max_length=200)
    purpose = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.material_name} - {self.recipient}"
    
    class Meta:
        ordering = ['-date_distributed']

# ============================================
# NUTRITION SUPPORT
# ============================================
class NutritionSupport(BaseModel):
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name='nutrition_records')
    assessment_date = models.DateField()
    nutrition_status = models.CharField(max_length=50, blank=True)
    food_ration = models.CharField(max_length=200, blank=True)
    supplement = models.CharField(max_length=200, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.child.full_name} - {self.assessment_date}"
    
    class Meta:
        ordering = ['-assessment_date']

# ============================================
# FOOD PARCELS
# ============================================
class FoodParcel(BaseModel):
    family_name = models.CharField(max_length=200)
    parcel_type = models.CharField(max_length=100)
    date_distributed = models.DateField()
    quantity = models.PositiveIntegerField(default=1)
    items_included = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.family_name} - {self.parcel_type} - {self.date_distributed}"
    
    class Meta:
        ordering = ['-date_distributed']

# ============================================
# COMMUNITY OUTREACH
# ============================================
class CommunityOutreach(BaseModel):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    activity_name = models.CharField(max_length=200)
    participants = models.PositiveIntegerField(default=0)
    date = models.DateField()
    location = models.CharField(max_length=200)
    objectives = models.TextField(blank=True)
    outcomes = models.TextField(blank=True)
    stigma_reduction_feedback = models.TextField(blank=True)
    follow_up_required = models.BooleanField(default=False)
    follow_up_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    follow_up_date = models.DateField(null=True, blank=True)
    follow_up_staff = models.CharField(max_length=200, blank=True)
    follow_up_notes = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.activity_name} - {self.date}"
    
    class Meta:
        ordering = ['-date']

# ============================================
# MEETINGS
# ============================================
class Meeting(BaseModel):
    MEETING_TYPES = [
        ('STAFF', 'Staff Meeting'),
        ('COMMUNITY', 'Community Meeting'),
        ('PARTNER', 'Partner Meeting'),
        ('REVIEW', 'Review Meeting'),
        ('PLANNING', 'Planning Meeting'),
        ('OTHER', 'Other'),
    ]
    
    meeting_type = models.CharField(max_length=20, choices=MEETING_TYPES)
    date = models.DateField()
    participants = models.PositiveIntegerField(default=0)
    minutes = models.TextField()
    decisions = models.TextField(blank=True)
    action_items = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.get_meeting_type_display()} - {self.date}"
    
    class Meta:
        ordering = ['-date']

# ============================================
# CHALLENGES
# ============================================
class Challenge(BaseModel):
    related_module = models.CharField(max_length=100)
    date = models.DateField()
    challenge_description = models.TextField()
    cause = models.TextField(blank=True)
    action_taken = models.TextField(blank=True)
    recommendation = models.TextField(blank=True)
    resolved = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.related_module} - {self.date}"
    
    class Meta:
        ordering = ['-date']

# ============================================
# SUCCESS STORIES
# ============================================
class SuccessStory(BaseModel):
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name='success_stories')
    title = models.CharField(max_length=200)
    description = models.TextField()
    before_story = models.TextField(blank=True)
    after_story = models.TextField(blank=True)
    photo = models.ImageField(upload_to='success_stories/', blank=True, null=True)
    video_url = models.URLField(blank=True)
    other_url = models.URLField(blank=True)
    featured = models.BooleanField(default=False)
    date_recorded = models.DateField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.title} - {self.child.full_name}"
    
    class Meta:
        ordering = ['-date_recorded']
        verbose_name_plural = 'Success Stories'



# ============================================
# SAFEGUARDING INCIDENTS
# ============================================
class SafeguardingIncident(BaseModel):
    INCIDENT_TYPES = [
        ('ABUSE', 'Suspected Abuse'),
        ('NEGLECT', 'Neglect'),
        ('SAFETY', 'Safety/Injury Incident'),
        ('BEHAVIORAL', 'Severe Behavioral Incident'),
        ('OTHER', 'Other'),
    ]
    
    child = models.ForeignKey(Child, on_delete=models.SET_NULL, null=True, blank=True, related_name='safeguarding_incidents')
    incident_type = models.CharField(max_length=20, choices=INCIDENT_TYPES)
    date_of_incident = models.DateField()
    reported_by = models.CharField(max_length=200)
    description = models.TextField()
    action_taken = models.TextField(blank=True)
    is_confidential = models.BooleanField(default=True)
    status = models.CharField(max_length=20, default='OPEN') # OPEN, CLOSED
    
    def __str__(self):
        return f"{self.incident_type} - {self.date_of_incident}"
        
    class Meta:
        ordering = ['-date_of_incident']

# ============================================
# FEEDBACK & COMPLAINTS
# ============================================
class Feedback(BaseModel):
    CHANNELS = [
        ('IN_PERSON', 'In Person'),
        ('PHONE', 'Phone'),
        ('SUGGESTION_BOX', 'Suggestion Box'),
        ('COMMUNITY_MEETING', 'Community Meeting'),
        ('OTHER', 'Other'),
    ]
    
    beneficiary_name = models.CharField(max_length=200, blank=True)
    date_received = models.DateField()
    channel = models.CharField(max_length=20, choices=CHANNELS)
    description = models.TextField()
    raised_by = models.CharField(max_length=200, blank=True)
    resolution = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Feedback - {self.date_received}"
        
    class Meta:
        ordering = ['-date_received']

class FinalReport(BaseModel):
    report_type = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    content = models.TextField()
    generated_at = models.DateTimeField(default=timezone.now)
    is_published = models.BooleanField(default=False)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-generated_at']


# ============================================
# NOTIFICATIONS
# ============================================
class Notification(BaseModel):
    NOTIFICATION_TYPES = [
        ('IMPENDING_INACTIVE', 'Impending Inactivity (1 Day Warning)'),
        ('AUTO_DEACTIVATED', 'Auto Deactivated (6 Months Inactivity)'),
        ('REACTIVATED', 'Reactivated'),
        ('GENERAL', 'General Alert'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    child = models.ForeignKey(Child, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES, default='GENERAL')
    title = models.CharField(max_length=250)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.notification_type}: {self.title}"

    class Meta:
        ordering = ['-created_at']


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    photo = models.ImageField(upload_to='profiles/', blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    sub_role = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"


from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    profile, created = UserProfile.objects.get_or_create(user=instance)
    profile.save()
