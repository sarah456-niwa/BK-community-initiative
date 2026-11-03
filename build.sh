#!/usr/bin/env bash
# Exit on error
set -o errexit

pip install -r requirements.txt
if [ -f manage.py ]; then
    python manage.py collectstatic --no-input
    python manage.py migrate
elif [ -f backend/manage.py ]; then
    python backend/manage.py collectstatic --no-input
    python backend/manage.py migrate
fi

