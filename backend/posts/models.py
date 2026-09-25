from django.conf import settings
from django.db import models


class Vibe(models.TextChoices):
    """The mood a post can carry. Stored as a short key, shown with an emoji."""

    HAPPY = "happy", "😊 Happy"
    HYPED = "hyped", "🔥 Hyped"
    INSPIRED = "inspired", "💡 Inspired"
    CHILL = "chill", "😌 Chill"
    GRATEFUL = "grateful", "❤️ Grateful"
    FOCUSED = "focused", "🎯 Focused"
    FUNNY = "funny", "😂 Funny"
    LATE_NIGHT = "late_night", "🌙 Late Night"
    MOTIVATED = "motivated", "🚀 Motivated"


def post_image_path(instance, filename):
    return f"posts/user_{instance.author_id}/{filename}"


class Post(models.Model):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="posts"
    )
    content = models.TextField(max_length=500)
    image = models.ImageField(upload_to=post_image_path, blank=True, null=True)
    vibe = models.CharField(max_length=20, choices=Vibe.choices, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.author.username}: {self.content[:40]}"


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments"
    )
    content = models.CharField(max_length=300)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.author.username} on #{self.post_id}: {self.content[:30]}"


class Like(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="likes"
    )
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # A user can like a given post only once
            models.UniqueConstraint(fields=["user", "post"], name="unique_like"),
        ]

    def __str__(self):
        return f"{self.user.username} ❤ #{self.post_id}"
