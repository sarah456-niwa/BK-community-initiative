import time
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from django.db import connection
from .models import Child, Notification

# ==============================================================================
# INACTIVITY CONFIGURATION
# ==============================================================================
# Set TEST_INACTIVITY_MINUTES to 3 for 3-minute testing.
# Set TEST_INACTIVITY_MINUTES to None to switch back to normal 180 days (6 months).
TEST_INACTIVITY_MINUTES = getattr(settings, 'CHILD_INACTIVITY_TEST_MINUTES', 3)

# Production threshold in days (used when TEST_INACTIVITY_MINUTES is None)
INACTIVITY_THRESHOLD_DAYS = getattr(settings, 'CHILD_INACTIVITY_THRESHOLD_DAYS', 180)

_LAST_CHECK_TIMESTAMP = 0
# Check every 5 seconds during test mode, or 60 seconds in production
CHECK_INTERVAL_SECONDS = 5 if TEST_INACTIVITY_MINUTES else 60


def ensure_notification_table():
    """
    Ensure SQLite table for Notification model exists.
    Executed safely with CREATE TABLE IF NOT EXISTS.
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS "api_notification" (
                "id" char(32) NOT NULL PRIMARY KEY,
                "created_at" datetime NOT NULL,
                "updated_at" datetime NOT NULL,
                "notification_type" varchar(30) NOT NULL,
                "title" varchar(250) NOT NULL,
                "message" text NOT NULL,
                "is_read" bool NOT NULL,
                "read_at" datetime NULL,
                "child_id" char(32) NULL REFERENCES "api_child" ("id") DEFERRABLE INITIALLY DEFERRED,
                "created_by_id" integer NULL REFERENCES "auth_user" ("id") DEFERRABLE INITIALLY DEFERRED,
                "updated_by_id" integer NULL REFERENCES "auth_user" ("id") DEFERRABLE INITIALLY DEFERRED,
                "user_id" integer NULL REFERENCES "auth_user" ("id") DEFERRABLE INITIALLY DEFERRED
            );
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS "api_notification_child_id" ON "api_notification" ("child_id");')
        cursor.execute('CREATE INDEX IF NOT EXISTS "api_notification_user_id" ON "api_notification" ("user_id");')
        cursor.execute('CREATE INDEX IF NOT EXISTS "api_notification_is_read" ON "api_notification" ("is_read");')

        try:
            cursor.execute("SELECT 1 FROM django_migrations WHERE app = 'api' AND name = '0007_notification';")
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES ('api', '0007_notification', datetime('now'));"
                )
        except Exception:
            pass


def get_child_last_activity_datetime(child):
    """
    Determine the most recent datetime of activity or engagement for a child
    across all operational modules. Returns a timezone-aware datetime.
    """
    dts = []

    def to_dt(val):
        if not val:
            return None
        if isinstance(val, datetime):
            return val if timezone.is_aware(val) else timezone.make_aware(val)
        # Convert date to datetime at start of that day
        return timezone.make_aware(datetime.combine(val, datetime.min.time()))

    # Child registration / profile modification dates
    if child.created_at:
        dts.append(to_dt(child.created_at))
    if child.updated_at:
        dts.append(to_dt(child.updated_at))
    if child.enrollment_date:
        dts.append(to_dt(child.enrollment_date))

    # 1. Referrals
    latest_referral = child.referrals.order_by('-created_at').first()
    if latest_referral:
        dt = latest_referral.created_at or latest_referral.referral_date
        if dt:
            dts.append(to_dt(dt))

    # 2. Clinical Assessments
    latest_assessment = child.assessments.order_by('-created_at').first()
    if latest_assessment:
        dt = latest_assessment.created_at or latest_assessment.date
        if dt:
            dts.append(to_dt(dt))

    # 3. Therapy Sessions
    latest_therapy = child.therapy_sessions.order_by('-created_at').first()
    if latest_therapy:
        dt = latest_therapy.created_at or latest_therapy.date
        if dt:
            dts.append(to_dt(dt))

    # 4. Assistive Devices
    latest_device = child.devices.order_by('-created_at').first()
    if latest_device:
        dt = latest_device.created_at or latest_device.date_issued
        if dt:
            dts.append(to_dt(dt))

    # 5. Sensory Devices
    latest_sensory = child.sensory_devices.order_by('-created_at').first()
    if latest_sensory:
        dt = latest_sensory.created_at or latest_sensory.date_distributed
        if dt:
            dts.append(to_dt(dt))

    # 6. Nutrition Assessments & Support
    latest_nutrition = child.nutrition_records.order_by('-created_at').first()
    if latest_nutrition:
        dt = latest_nutrition.created_at or latest_nutrition.assessment_date
        if dt:
            dts.append(to_dt(dt))

    # 7. Document Uploads
    latest_doc = child.documents.order_by('-uploaded_at').first()
    if latest_doc and latest_doc.uploaded_at:
        dts.append(to_dt(latest_doc.uploaded_at))

    # 8. Success Stories
    latest_story = child.success_stories.order_by('-created_at').first()
    if latest_story:
        dt = latest_story.created_at or latest_story.date_recorded
        if dt:
            dts.append(to_dt(dt))

    # 9. Safeguarding Incidents
    latest_incident = child.safeguarding_incidents.order_by('-created_at').first()
    if latest_incident:
        dt = latest_incident.created_at or latest_incident.date_of_incident
        if dt:
            dts.append(to_dt(dt))

    # 10. Reactivations (explicitly resets the inactivity clock from the reactivation timestamp)
    latest_reactivation = child.notifications.filter(notification_type='REACTIVATED').order_by('-created_at').first()
    if latest_reactivation and latest_reactivation.created_at:
        dts.append(to_dt(latest_reactivation.created_at))

    valid_dts = [d for d in dts if d is not None]
    return max(valid_dts) if valid_dts else (to_dt(child.created_at) or timezone.now())


def get_child_last_activity_date(child):
    """
    Determine the most recent date of activity for a child.
    Maintained for backward compatibility.
    """
    latest_dt = get_child_last_activity_datetime(child)
    return latest_dt.date() if latest_dt else timezone.now().date()


def check_and_update_inactivity(force=False):
    """
    Scans active children.
    - If TEST_INACTIVITY_MINUTES is active (e.g. 3 minutes):
        - Warnings generated at 2 minutes (1 minute before deactivation).
        - Auto-deactivated at >= 3 minutes.
    - If in production mode (TEST_INACTIVITY_MINUTES is None):
        - Warnings generated at 179 days (1 day before deactivation).
        - Auto-deactivated at >= 180 days (6 months).
    """
    global _LAST_CHECK_TIMESTAMP
    now_ts = time.time()

    if not force and (now_ts - _LAST_CHECK_TIMESTAMP) < CHECK_INTERVAL_SECONDS:
        return {'status': 'skipped', 'reason': 'throttled'}

    ensure_notification_table()
    _LAST_CHECK_TIMESTAMP = now_ts

    now = timezone.now()
    active_children = Child.objects.filter(status='ACTIVE')
    deactivated_count = 0
    warnings_sent = 0

    # ==========================================================================
    # BRANCH A: MINUTE-BASED TESTING MODE (e.g. 3 MINUTES)
    # ==========================================================================
    if TEST_INACTIVITY_MINUTES is not None:
        threshold_seconds = TEST_INACTIVITY_MINUTES * 60  # e.g. 180s for 3 min
        warning_seconds_min = max(0, (TEST_INACTIVITY_MINUTES - 1) * 60)  # e.g. 120s (2 min)
        # Suppress duplicate notifications within the last 10 minutes during tests
        test_cutoff = now - timedelta(minutes=10)

        for child in active_children:
            last_dt = get_child_last_activity_datetime(child)
            seconds_inactive = max(0, (now - last_dt).total_seconds())

            # Case 1: Reached or exceeded 3 minutes (180s)
            if seconds_inactive >= threshold_seconds:
                child.status = 'INACTIVE'
                child.save(update_fields=['status'])
                deactivated_count += 1

                already_notified = Notification.objects.filter(
                    child=child,
                    notification_type='AUTO_DEACTIVATED',
                    created_at__gte=test_cutoff
                ).exists()

                if not already_notified:
                    minutes_str = f"{int(seconds_inactive // 60)} minutes" if seconds_inactive >= 60 else f"{int(seconds_inactive)} seconds"
                    Notification.objects.create(
                        child=child,
                        notification_type='AUTO_DEACTIVATED',
                        title=f"🔴 Child Auto-Deactivated: {child.full_name}",
                        message=(
                            f"Child {child.full_name} ({child.child_id}) has had no recorded activity "
                            f"for {minutes_str} (3-minute test threshold). "
                            f"Status has been automatically updated to INACTIVE. "
                            f"You can reactivate this child whenever work resumes."
                        ),
                        is_read=False
                    )

            # Case 2: Warning period (between 2 min and 3 min, 1 minute before deactivation)
            elif seconds_inactive >= warning_seconds_min:
                already_warned = Notification.objects.filter(
                    child=child,
                    notification_type='IMPENDING_INACTIVE',
                    created_at__gte=test_cutoff
                ).exists()

                if not already_warned:
                    Notification.objects.create(
                        child=child,
                        notification_type='IMPENDING_INACTIVE',
                        title=f"⚠️ Deactivating in 1 Minute: {child.full_name}",
                        message=(
                            f"Notice: Child {child.full_name} ({child.child_id}) has had no recorded activity "
                            f"for 2 minutes. This child's status will automatically turn INACTIVE in 1 minute "
                            f"unless an activity or service is recorded."
                        ),
                        is_read=False
                    )
                    warnings_sent += 1

        return {
            'status': 'success',
            'mode': 'minute_test',
            'test_minutes': TEST_INACTIVITY_MINUTES,
            'checked_at': now.isoformat(),
            'deactivated_count': deactivated_count,
            'warnings_sent': warnings_sent
        }

    # ==========================================================================
    # BRANCH B: PRODUCTION DAY-BASED MODE (180 DAYS = 6 MONTHS)
    # ==========================================================================
    today = now.date()
    WARNING_DAY = INACTIVITY_THRESHOLD_DAYS - 1
    recent_cutoff = now - timedelta(days=7)

    for child in active_children:
        last_activity = get_child_last_activity_date(child)
        days_inactive = (today - last_activity).days

        # Case 1: Inactivity reached or exceeded threshold (180 days)
        if days_inactive >= INACTIVITY_THRESHOLD_DAYS:
            child.status = 'INACTIVE'
            child.save(update_fields=['status'])
            deactivated_count += 1

            already_notified = Notification.objects.filter(
                child=child,
                notification_type='AUTO_DEACTIVATED',
                created_at__gte=recent_cutoff
            ).exists()

            if not already_notified:
                Notification.objects.create(
                    child=child,
                    notification_type='AUTO_DEACTIVATED',
                    title=f"🔴 Child Auto-Deactivated: {child.full_name}",
                    message=(
                        f"Child {child.full_name} ({child.child_id}) has had no recorded activity or service "
                        f"across all modules for {days_inactive} days (6 months). "
                        f"Last activity recorded was on {last_activity.strftime('%d %b %Y')}. "
                        f"Status has been automatically updated to INACTIVE. "
                        f"You can reactivate this child whenever work resumes."
                    ),
                    is_read=False
                )

        # Case 2: 1 day before threshold (179 days)
        elif days_inactive == WARNING_DAY:
            already_warned = Notification.objects.filter(
                child=child,
                notification_type='IMPENDING_INACTIVE',
                created_at__gte=recent_cutoff
            ).exists()

            if not already_warned:
                Notification.objects.create(
                    child=child,
                    notification_type='IMPENDING_INACTIVE',
                    title=f"⚠️ Deactivating Tomorrow: {child.full_name}",
                    message=(
                        f"Notice: Child {child.full_name} ({child.child_id}) has had no recorded activity "
                        f"for {days_inactive} days (nearly 6 months). "
                        f"This child's status will automatically turn INACTIVE tomorrow unless "
                        f"an activity or service is recorded."
                    ),
                    is_read=False
                )
                warnings_sent += 1

    return {
        'status': 'success',
        'mode': 'production_days',
        'threshold_days': INACTIVITY_THRESHOLD_DAYS,
        'checked_at': today.isoformat(),
        'deactivated_count': deactivated_count,
        'warnings_sent': warnings_sent
    }
