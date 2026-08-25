from django.urls import path
from rest_framework.routers import DefaultRouter
from society.views import SocietyViewSet, BlockViewSet, FlatViewSet, ResidentFlatMappingViewSet

router = DefaultRouter()
router.register(r'societies', SocietyViewSet, basename='society')
router.register(r'blocks', BlockViewSet, basename='block')
router.register(r'flats', FlatViewSet, basename='flat')
router.register(r'resident-flats', ResidentFlatMappingViewSet, basename='resident-flat')

urlpatterns = router.urls
