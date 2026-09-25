"""Reusable queryset helpers so counts and follow-state are computed in SQL."""

from django.contrib.auth import get_user_model
from django.db.models import Count, Exists, IntegerField, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce

from .models import Follow

User = get_user_model()


def count_subquery(queryset, field):
    """Return a correlated COUNT(*) subquery, e.g. followers per user."""
    counted = (
        queryset.filter(**{field: OuterRef("pk")})
        .order_by()
        .values(field)
        .annotate(c=Count("pk"))
        .values("c")
    )
    return Coalesce(Subquery(counted, output_field=IntegerField()), Value(0))


def mutual_ids(user):
    """IDs of members who follow `user` AND whom `user` follows back.

    VibeHive's privacy rule: posts are only visible between mutual followers
    (plus your own posts, of course).
    """
    following = Follow.objects.filter(follower=user).values("following_id")
    return Follow.objects.filter(following=user, follower_id__in=following).values("follower_id")


def are_mutual(a, b):
    return (
        Follow.objects.filter(follower=a, following=b).exists()
        and Follow.objects.filter(follower=b, following=a).exists()
    )


def can_see_posts(viewer, author):
    return viewer.pk == author.pk or are_mutual(viewer, author)


def users_with_stats(viewer, queryset=None):
    """Annotate users with followers/following/posts counts and follow state."""
    from posts.models import Post  # local import avoids a circular import

    qs = queryset if queryset is not None else User.objects.all()
    qs = qs.filter(is_active=True).select_related("profile").annotate(
        followers_count=count_subquery(Follow.objects.all(), "following"),
        following_count=count_subquery(Follow.objects.all(), "follower"),
        posts_count=count_subquery(Post.objects.all(), "author"),
    )
    if viewer is not None and viewer.is_authenticated:
        qs = qs.annotate(
            is_following=Exists(
                Follow.objects.filter(follower=viewer, following=OuterRef("pk"))
            ),
            follows_you=Exists(
                Follow.objects.filter(follower=OuterRef("pk"), following=viewer)
            ),
        )
    return qs
