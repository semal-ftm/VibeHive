from django.conf import settings
from django.db import models
from django.db.models import F, Q


def avatar_upload_path(instance, filename):
    return f"avatars/user_{instance.user_id}/{filename}"


class Profile(models.Model):
    """Extra public information for each user (one-to-one with auth.User)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    full_name = models.CharField(max_length=80, blank=True)
    bio = models.CharField(max_length=280, blank=True)
    avatar = models.ImageField(upload_to=avatar_upload_path, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile of {self.user.username}"

    @property
    def display_name(self):
        return self.full_name or self.user.username


class Follow(models.Model):
    """`follower` follows `following`. One row per relationship."""

    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="following_set"
    )
    following = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="follower_set"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # Prevent duplicate follows
            models.UniqueConstraint(fields=["follower", "following"], name="unique_follow"),
            # Prevent users from following themselves
            models.CheckConstraint(condition=~Q(follower=F("following")), name="no_self_follow"),
        ]

    def __str__(self):
        return f"{self.follower} -> {self.following}"
