# Generated migration for Notification model
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0006_child_consent_date_child_consent_given_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='Notification',
                    fields=[
                        ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('notification_type', models.CharField(choices=[('IMPENDING_INACTIVE', 'Impending Inactivity (1 Day Warning)'), ('AUTO_DEACTIVATED', 'Auto Deactivated (6 Months Inactivity)'), ('REACTIVATED', 'Reactivated'), ('GENERAL', 'General Alert')], default='GENERAL', max_length=30)),
                        ('title', models.CharField(max_length=250)),
                        ('message', models.TextField()),
                        ('is_read', models.BooleanField(default=False)),
                        ('read_at', models.DateTimeField(blank=True, null=True)),
                        ('child', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='api.child')),
                        ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(class)s_created', to=settings.AUTH_USER_MODEL)),
                        ('updated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(class)s_updated', to=settings.AUTH_USER_MODEL)),
                        ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'ordering': ['-created_at'],
                    },
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
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
                    CREATE INDEX IF NOT EXISTS "api_notification_child_id" ON "api_notification" ("child_id");
                    CREATE INDEX IF NOT EXISTS "api_notification_user_id" ON "api_notification" ("user_id");
                    CREATE INDEX IF NOT EXISTS "api_notification_is_read" ON "api_notification" ("is_read");
                    """,
                    reverse_sql='DROP TABLE IF EXISTS "api_notification";'
                )
            ]
        ),
    ]
