from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from posts.models import Vibe

TYPING_WINDOW = timedelta(seconds=5)


class Conversation(models.Model):
    """A private 1-to-1 chat. `user_a` always has the lower id, so each pair has one row."""

    user_a = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    user_b = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(default=timezone.now, db_index=True)  # time of the last message
    a_typing_at = models.DateTimeField(null=True, blank=True)
    b_typing_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [models.UniqueConstraint(fields=["user_a", "user_b"], name="unique_conversation")]

    def __str__(self):
        return f"{self.user_a} ↔ {self.user_b}"

    @classmethod
    def between(cls, first, second):
        a, b = sorted([first, second], key=lambda u: u.pk)
        conversation, _ = cls.objects.get_or_create(user_a=a, user_b=b)
        return conversation

    def has(self, user):
        return user.pk in (self.user_a_id, self.user_b_id)

    def other(self, user):
        return self.user_b if user.pk == self.user_a_id else self.user_a

    def mark_typing(self, user, typing=True):
        field = "a_typing_at" if user.pk == self.user_a_id else "b_typing_at"
        setattr(self, field, timezone.now() if typing else None)
        self.save(update_fields=[field])

    def other_is_typing(self, user):
        stamp = self.b_typing_at if user.pk == self.user_a_id else self.a_typing_at
        return bool(stamp and timezone.now() - stamp < TYPING_WINDOW)


def chat_image_path(instance, filename):
    return f"chat/conversation_{instance.conversation_id}/{filename}"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages")
    text = models.TextField(max_length=1000, blank=True)
    image = models.ImageField(upload_to=chat_image_path, blank=True, null=True)
    vibe = models.CharField(max_length=20, choices=Vibe.choices, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"{self.sender}: {self.text[:30] or '📷'}"

    @property
    def preview(self):
        return self.text[:80] if self.text else "📷 Photo"


class Reaction(models.Model):
    EMOJIS = ["❤️", "😂", "🔥", "😮", "😢", "👍"]

    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    emoji = models.CharField(max_length=8, choices=[(e, e) for e in EMOJIS])

    class Meta:
        # one reaction per person per message (picking another one replaces it)
        constraints = [models.UniqueConstraint(fields=["message", "user"], name="one_reaction_per_user")]
