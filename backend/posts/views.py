import re
from collections import Counter
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Exists, OuterRef, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import Follow
from users.queries import can_see_posts, count_subquery, mutual_ids, users_with_stats
from users.serializers import UserSummarySerializer

from . import vibes
from .models import Comment, Like, Post, Vibe
from .permissions import IsAuthorOrReadOnly
from .serializers import CommentSerializer, PostSerializer, vibe_info

User = get_user_model()
HASHTAG_RE = re.compile(r"#(\w{2,30})")


def visible_posts(viewer):
    """
    The privacy rule: you see your own posts, plus posts from people you
    follow who also follow you back (mutual followers). Everyone else's posts
    are hidden in feeds, profiles, explore, hashtags and single-post links.
    """
    return Post.objects.filter(Q(author=viewer) | Q(author_id__in=mutual_ids(viewer)))


def posts_for(viewer):
    """Visible posts with like/comment counts and whether `viewer` liked each one."""
    return visible_posts(viewer).select_related("author__profile").annotate(
        like_count=count_subquery(Like.objects.all(), "post"),
        comment_count=count_subquery(Comment.objects.all(), "post"),
        is_liked=Exists(Like.objects.filter(user=viewer, post=OuterRef("pk"))),
    )


# ---------------------------------------------------------------------------
# Posts
# ---------------------------------------------------------------------------
class PostListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/posts/                    – posts you may see (yours + mutual followers), newest first
         ?feed=following                – same as above (kept for older clients)
         ?author=<id>                   – one member's posts (profile page)
         ?vibe=<key>  ?tag=<hashtag>    – filter by vibe or hashtag
         ?sort=popular                  – most liked in the last 30 days (explore)
    POST /api/posts/                    – create (multipart: content, vibe, image)
    """

    serializer_class = PostSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        me = self.request.user
        params = self.request.query_params
        qs = posts_for(me)

        if params.get("author"):
            qs = qs.filter(author_id=params["author"])
        if params.get("vibe") in Vibe.values:
            qs = qs.filter(vibe=params["vibe"])
        if params.get("tag"):
            tag = params["tag"].lstrip("#")
            qs = qs.filter(content__iregex=r"#" + re.escape(tag) + r"\b")
        if params.get("sort") == "popular":
            since = timezone.now() - timedelta(days=30)
            return qs.filter(created_at__gte=since).order_by("-like_count", "-comment_count", "-created_at")
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Re-read with annotations so the response matches list items exactly
        post = posts_for(request.user).get(pk=serializer.instance.pk)
        data = self.get_serializer(post).data
        return Response(data, status=status.HTTP_201_CREATED)


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET / PATCH / DELETE /api/posts/{id}/ – only the author may change it."""

    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return posts_for(self.request.user)

    def perform_destroy(self, instance):
        if instance.image:
            instance.image.delete(save=False)
        instance.delete()

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        super().update(request, *args, **kwargs)
        post = self.get_queryset().get(pk=kwargs["pk"])
        return Response(self.get_serializer(post).data)



class LikeView(APIView):
    """POST = like, DELETE = unlike   /api/posts/{id}/like/"""

    def _response(self, post, liked):
        return Response({"liked": liked, "like_count": post.likes.count()})

    def post(self, request, pk):
        post = get_object_or_404(visible_posts(request.user), pk=pk)
        # get_or_create + the unique constraint make double-likes impossible
        Like.objects.get_or_create(user=request.user, post=post)
        return self._response(post, True)

    def delete(self, request, pk):
        post = get_object_or_404(visible_posts(request.user), pk=pk)
        Like.objects.filter(user=request.user, post=post).delete()
        return self._response(post, False)


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------
class CommentListCreateView(generics.ListCreateAPIView):
    """GET / POST /api/posts/{id}/comments/"""

    serializer_class = CommentSerializer
    pagination_class = None

    def get_post(self):
        return get_object_or_404(visible_posts(self.request.user), pk=self.kwargs["pk"])

    def get_queryset(self):
        return (
            Comment.objects.filter(post=self.get_post())
            .select_related("author__profile")
            .order_by("created_at")
        )

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, post=self.get_post())


class CommentDetailView(generics.DestroyAPIView):
    """DELETE /api/comments/{id}/ – only the comment's author may delete it."""

    serializer_class = CommentSerializer
    queryset = Comment.objects.all()
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]



# ---------------------------------------------------------------------------
# Discovery + activity
# ---------------------------------------------------------------------------
class TrendingView(APIView):
    """GET /api/trending/ – top vibes, top hashtags and a few hive stats."""

    def get(self, request):
        now = timezone.now()
        recent = Post.objects.filter(created_at__gte=now - timedelta(days=7))
        source = recent if recent.exists() else Post.objects.all()

        vibe_rows = (
            source.exclude(vibe="").values("vibe").annotate(count=Count("id")).order_by("-count")[:5]
        )
        vibes = [{**vibe_info(row["vibe"]), "count": row["count"]} for row in vibe_rows]

        # Hashtags reveal post text, so they come only from posts you're allowed to see.
        # Vibe counts and stats are anonymous totals, so they cover the whole hive.
        visible_recent = source.filter(pk__in=visible_posts(request.user).values("pk"))
        tag_counter = Counter()
        for content in visible_recent.order_by("-created_at").values_list("content", flat=True)[:500]:
            tag_counter.update({t.lower() for t in HASHTAG_RE.findall(content)})
        topics = [{"tag": tag, "count": count} for tag, count in tag_counter.most_common(6)]

        stats = {
            "members": User.objects.filter(is_active=True).count(),
            "posts": Post.objects.count(),
            "posts_today": Post.objects.filter(created_at__gte=now - timedelta(days=1)).count(),
        }
        return Response({"vibes": vibes, "topics": topics, "stats": stats})


class VibeListView(APIView):
    """GET /api/vibes/ – the vibe options for the post composer."""

    def get(self, request):
        return Response([vibe_info(key) for key in Vibe.values])


class NotificationsView(APIView):
    """
    GET /api/notifications/ – recent activity on your content:
    likes and comments on your posts, and new followers.
    Built from existing Like/Comment/Follow rows – no extra table needed.
    """

    LIMIT = 40

    def get(self, request):
        me = request.user
        ctx = {"request": request}
        my_following = set(Follow.objects.filter(follower=me).values_list("following_id", flat=True))

        def actor(user):
            data = UserSummarySerializer(user, context=ctx).data
            data["is_following"] = user.pk in my_following
            return data

        def excerpt(post):
            return {"id": post.pk, "excerpt": post.content[:80]}

        items = []
        likes = (
            Like.objects.filter(post__author=me).exclude(user=me)
            .select_related("user__profile", "post")[: self.LIMIT]
        )
        for like in likes:
            items.append({
                "type": "like", "id": f"like-{like.pk}", "created_at": like.created_at,
                "actor": actor(like.user), "post": excerpt(like.post),
            })
        comments = (
            Comment.objects.filter(post__author=me).exclude(author=me)
            .select_related("author__profile", "post").order_by("-created_at")[: self.LIMIT]
        )
        for comment in comments:
            items.append({
                "type": "comment", "id": f"comment-{comment.pk}", "created_at": comment.created_at,
                "actor": actor(comment.author), "post": excerpt(comment.post),
                "comment": comment.content,
            })
        follows = Follow.objects.filter(following=me).select_related("follower__profile")[: self.LIMIT]
        for follow in follows:
            items.append({
                "type": "follow", "id": f"follow-{follow.pk}", "created_at": follow.created_at,
                "actor": actor(follow.follower),
            })

        items.sort(key=lambda item: item["created_at"], reverse=True)
        return Response(items[: self.LIMIT])


# ---------------------------------------------------------------------------
# Vibe Match + Vibe Calendar (see posts/vibes.py for the logic)
# ---------------------------------------------------------------------------
def vibe_breakdown(vector):
    """A member's vibe mix as percentages, e.g. for the "vibe DNA" bars."""
    return {
        "total": sum(vector.values()),
        "vibes": [{**vibe_info(key), "share": round(share * 100)} for key, share in vibes.shares(vector)],
    }


class VibeMatchView(APIView):
    """GET /api/users/{id}/vibe-match/ – how well your vibes match theirs."""

    def get(self, request, pk):
        me = request.user
        target = get_object_or_404(User, pk=pk, is_active=True)
        vectors = vibes.vibe_vectors([me.pk, target.pk])
        mine, theirs = vectors[me.pk], vectors[target.pk]
        result = vibes.compare(mine, theirs)
        # Their full vibe mix is personal: only mutual followers see it
        if can_see_posts(me, target):
            them = vibe_breakdown(theirs)
        else:
            them = {"total": sum(theirs.values()), "vibes": [], "hidden": True}
        return Response({
            **result,
            "shared": [vibe_info(key) for key in result["shared"]],
            "is_me": target.pk == me.pk,
            "needed": vibes.MIN_VIBE_POSTS,
            "me": vibe_breakdown(mine),
            "them": them,
        })


class VibeMatchesView(APIView):
    """GET /api/vibe-matches/?limit=6 – members whose vibes match yours best."""

    def get(self, request):
        me = request.user
        try:
            limit = min(max(int(request.query_params.get("limit", 6)), 1), 20)
        except ValueError:
            limit = 6
        candidate_ids = list(
            Post.objects.exclude(vibe="").exclude(author=me)
            .filter(author__is_active=True)
            .order_by().values_list("author_id", flat=True).distinct()[:500]
        )
        vectors = vibes.vibe_vectors(candidate_ids + [me.pk])
        mine = vectors[me.pk]
        have = sum(mine.values())
        if have < vibes.MIN_VIBE_POSTS:
            return Response({"ready": False, "have": have, "needed": vibes.MIN_VIBE_POSTS, "results": []})

        scored = []
        for user_id in candidate_ids:
            result = vibes.compare(mine, vectors[user_id])
            if result["score"]:
                scored.append((result["score"], user_id, result))
        scored.sort(key=lambda item: (item[0], -item[1]), reverse=True)
        top = scored[:limit]

        users = users_with_stats(me, User.objects.filter(pk__in=[uid for _, uid, _ in top])).in_bulk()
        ctx = {"request": request}
        results = [
            {
                "user": UserSummarySerializer(users[uid], context=ctx).data,
                "score": result["score"],
                "label": result["label"],
                "emoji": result["emoji"],
                "shared": [vibe_info(key) for key in result["shared"]],
            }
            for _, uid, result in top if uid in users
        ]
        return Response({"ready": True, "have": have, "needed": vibes.MIN_VIBE_POSTS, "results": results})


class VibeCalendarView(APIView):
    """
    GET /api/users/{id}/vibe-calendar/?weeks=26&tz=<minutes>
    Daily vibe activity for the grid on a profile. `tz` is the browser's
    Date.getTimezoneOffset() so days line up with the viewer's local time.
    """

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk, is_active=True)
        if not can_see_posts(request.user, user):
            return Response({"locked": True})
        try:
            weeks = min(max(int(request.query_params.get("weeks", 26)), 4), 53)
            tz = min(max(int(request.query_params.get("tz", 0)), -840), 840)
        except ValueError:
            weeks, tz = 26, 0
        data = vibes.vibe_calendar(user, weeks=weeks, tz_offset_minutes=tz)
        summary = data["summary"]
        for key in ("top_vibe", "month_vibe"):
            summary[key] = vibe_info(summary[key]) if summary[key] else None
        summary["vibe_totals"] = [
            {**vibe_info(key), "count": count} for key, count in summary["vibe_totals"].items()
        ]
        return Response(data)
