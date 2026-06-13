from django.db import models
from django.contrib.auth.models import User


class ChatHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    predicted_disease = models.CharField(max_length=255, blank=True, null=True)
    doctor_advice = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.predicted_disease}"