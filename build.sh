
#!/usr/bin/env bash
set -o errexit

# Install dependencies from the backend folder
python -m pip install -r backend/requirements.txt

# Collect static files
python backend/manage.py collectstatic --no-input

# Apply database migrations
python backend/manage.py migrate
