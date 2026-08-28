from rest_framework import serializers
from society.models import Society, Block, Flat, ResidentFlatMapping, UserSocietyAssignment
from users.serializers import UserSerializer

class FlatSerializer(serializers.ModelSerializer):
    block_name = serializers.CharField(source='block.name', read_only=True)
    society_name = serializers.CharField(source='block.society.name', read_only=True)

    class Meta:
        model = Flat
        fields = ['id', 'block', 'block_name', 'society_name', 'flat_number', 'floor']

class BlockSerializer(serializers.ModelSerializer):
    society_name = serializers.CharField(source='society.name', read_only=True)
    flats = FlatSerializer(many=True, read_only=True)

    class Meta:
        model = Block
        fields = ['id', 'society', 'society_name', 'name', 'code', 'flats']

class SocietySerializer(serializers.ModelSerializer):
    blocks = BlockSerializer(many=True, read_only=True)
    total_blocks = serializers.SerializerMethodField()
    total_flats = serializers.SerializerMethodField()
    state = serializers.CharField(required=False, default='State Capital')
    pincode = serializers.CharField(required=False, default='000000')

    class Meta:
        model = Society
        fields = ['id', 'name', 'address', 'city', 'state', 'pincode', 'contact_phone', 'contact_email', 'blocks', 'total_blocks', 'total_flats', 'created_at']

    def get_total_blocks(self, obj):
        return obj.blocks.count()

    def get_total_flats(self, obj):
        return Flat.objects.filter(block__society=obj).count()

class ResidentFlatMappingSerializer(serializers.ModelSerializer):
    resident_details = UserSerializer(source='resident', read_only=True)
    flat_details = FlatSerializer(source='flat', read_only=True)

    class Meta:
        model = ResidentFlatMapping
        fields = ['id', 'resident', 'flat', 'resident_details', 'flat_details', 'is_owner', 'is_active', 'assigned_at']
