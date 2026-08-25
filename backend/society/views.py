from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from society.models import Society, Block, Flat, ResidentFlatMapping
from society.serializers import SocietySerializer, BlockSerializer, FlatSerializer, ResidentFlatMappingSerializer
from users.permissions import IsAdminRole
from audit.models import log_action

class SocietyViewSet(viewsets.ModelViewSet):
    queryset = Society.objects.all().order_by('name')
    serializer_class = SocietySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminRole()]

    def perform_create(self, serializer):
        society = serializer.save()
        log_action(self.request.user, "CREATE_SOCIETY", target=f"Society:{society.name}")

    def perform_update(self, serializer):
        society = serializer.save()
        log_action(self.request.user, "UPDATE_SOCIETY", target=f"Society:{society.name}")

    def perform_destroy(self, instance):
        log_action(self.request.user, "DELETE_SOCIETY", target=f"Society:{instance.name}")
        instance.delete()

class BlockViewSet(viewsets.ModelViewSet):
    queryset = Block.objects.all().order_by('name')
    serializer_class = BlockSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminRole()]

    def get_queryset(self):
        qs = super().get_queryset()
        society_id = self.request.query_params.get('society_id')
        if society_id:
            qs = qs.filter(society_id=society_id)
        return qs

    def perform_create(self, serializer):
        block = serializer.save()
        log_action(self.request.user, "CREATE_BLOCK", target=f"Block:{block.name}")

class FlatViewSet(viewsets.ModelViewSet):
    queryset = Flat.objects.all().order_by('flat_number')
    serializer_class = FlatSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminRole()]

    def get_queryset(self):
        qs = super().get_queryset()
        block_id = self.request.query_params.get('block_id')
        society_id = self.request.query_params.get('society_id')
        if block_id:
            qs = qs.filter(block_id=block_id)
        elif society_id:
            qs = qs.filter(block__society_id=society_id)
        return qs

    def perform_create(self, serializer):
        flat = serializer.save()
        log_action(self.request.user, "CREATE_FLAT", target=f"Flat:{flat.flat_number}")

class ResidentFlatMappingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    queryset = ResidentFlatMapping.objects.all()
    serializer_class = ResidentFlatMappingSerializer

    def perform_create(self, serializer):
        mapping = serializer.save()
        log_action(self.request.user, "ASSIGN_RESIDENT_FLAT", target=f"Resident:{mapping.resident.username} -> Flat:{mapping.flat.flat_number}")
