
#!/usr/bin/env bash
set -o errexit

# Install dependencies from the backend folder
python -m pip install -r backend/requirements.txt

# Collect static files
python backend/manage.py collectstatic --no-input

# Apply database migrations
python backend/manage.py migrate

# Create superuser automatically if environment variables are provided (useful for Render Free Tier)
if [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python backend/manage.py createsuperuser --no-input || true
fi
