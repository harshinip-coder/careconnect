from django.db import models
from django.conf import settings

class Society(models.Model):
    name = models.CharField(max_length=200, db_index=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=20)
    contact_phone = models.CharField(max_length=20, blank=True, default='')
    contact_email = models.EmailField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'careconnect_societies'
        verbose_name_plural = 'Societies'
        ordering = ['name']

    def __str__(self):
        return self.name

class Block(models.Model):
    society = models.ForeignKey(Society, on_delete=models.CASCADE, related_name='blocks')
    name = models.CharField(max_length=100)  # e.g. "Block A", "Tower 1"
    code = models.CharField(max_length=20, blank=True, default='')

    class Meta:
        db_table = 'careconnect_blocks'
        unique_together = ('society', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.society.name} - {self.name}"

class Flat(models.Model):
    block = models.ForeignKey(Block, on_delete=models.CASCADE, related_name='flats')
    flat_number = models.CharField(max_length=50)  # e.g. "101", "A-204"
    floor = models.IntegerField(default=1)

    class Meta:
        db_table = 'careconnect_flats'
        unique_together = ('block', 'flat_number')
        ordering = ['flat_number']

    def __str__(self):
        return f"{self.block.society.name} | {self.block.name} | Flat {self.flat_number}"

class ResidentFlatMapping(models.Model):
    resident = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='flat_mappings')
    flat = models.ForeignKey(Flat, on_delete=models.CASCADE, related_name='resident_mappings')
    is_owner = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'careconnect_resident_flats'
        unique_together = ('resident', 'flat')

    def __str__(self):
        return f"{self.resident.username} -> {self.flat}"

class UserSocietyAssignment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='society_assignments')
    society = models.ForeignKey(Society, on_delete=models.CASCADE, related_name='user_assignments')
    role_name = models.CharField(max_length=50, blank=True, default='')

    class Meta:
        db_table = 'careconnect_user_societies'
        unique_together = ('user', 'society')

    def __str__(self):
        return f"{self.user.username} @ {self.society.name}"
