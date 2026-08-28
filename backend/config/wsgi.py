import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

try:
    from society.models import Society
    if Society.objects.count() == 0:
        from seed_data import run_seed
        run_seed()
except Exception as e:
    print(f"Auto seed check error: {e}")

