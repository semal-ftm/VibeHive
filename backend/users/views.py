from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Follow
from .queries import users_with_stats
from .serializers import (
    LoginSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserDetailSerializer,
    UserSummarySerializer,
)

User = get_user_model()


def auth_payload(user, request):
    """Token + current user, returned after register/login."""
    token, _ = Token.objects.get_or_create(user=user)
    me = users_with_stats(user).get(pk=user.pk)
    return {"token": token.key, "user": UserDetailSerializer(me, context={"request": request}).data}


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
class RegisterView(APIView):
    """POST /api/register/ – create an account and return an auth token."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        request.user = user
        return Response(auth_payload(user, request), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/login/ – exchange username/email + password for a token."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        request.user = user
        return Response(auth_payload(user, request))


class LogoutView(APIView):
    """POST /api/logout/ – revoke the current token."""

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Current user's profile
# ---------------------------------------------------------------------------
class ProfileView(APIView):
    """GET/PUT/PATCH /api/profile/ – read or update the logged-in user's profile."""

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_me(self, request):
        return users_with_stats(request.user).get(pk=request.user.pk)

    def get(self, request):
        return Response(UserDetailSerializer(self.get_me(request), context={"request": request}).data)

    def put(self, request):
        serializer = ProfileUpdateSerializer(request.user.profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserDetailSerializer(self.get_me(request), context={"request": request}).data)

    patch = put


# ---------------------------------------------------------------------------
# Users, follow system and search
# ---------------------------------------------------------------------------
class UserListView(generics.ListAPIView):
    """
    GET /api/users/                 – all members, newest first
    GET /api/users/?suggested=1     – people you don't follow yet (most followed first)
    """

    serializer_class = UserSummarySerializer

    def get_queryset(self):
        me = self.request.user
        qs = users_with_stats(me)
        if self.request.query_params.get("suggested"):
            followed_ids = Follow.objects.filter(follower=me).values("following_id")
            return qs.exclude(pk=me.pk).exclude(pk__in=followed_ids).order_by(
                "-followers_count", "-date_joined"
            )
        return qs.order_by("-date_joined")


class UserDetailView(generics.RetrieveAPIView):
    """GET /api/users/{id}/ – a member's public profile."""

    serializer_class = UserDetailSerializer

    def get_queryset(self):
        return users_with_stats(self.request.user)


class FollowView(APIView):
    """POST = follow, DELETE = unfollow   /api/users/{id}/follow/"""

    def _response(self, request, target, following):
        target = users_with_stats(request.user).get(pk=target.pk)
        return Response({
            "following": following,
            "followers_count": target.followers_count,
            # True when you now follow each other, so you can see each other's posts
            "mutual": bool(following and target.follows_you),
        })

    def post(self, request, pk):
        target = get_object_or_404(User, pk=pk, is_active=True)
        if target == request.user:
            return Response(
                {"detail": "You can't follow yourself."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            Follow.objects.get_or_create(follower=request.user, following=target)
        except IntegrityError:
            pass  # already following (race between two clicks) – harmless
        return self._response(request, target, True)

    def delete(self, request, pk):
        target = get_object_or_404(User, pk=pk)
        Follow.objects.filter(follower=request.user, following=target).delete()
        return self._response(request, target, False)


class FollowersListView(generics.ListAPIView):
    """GET /api/users/{id}/followers/"""

    serializer_class = UserSummarySerializer

    def get_queryset(self):
        user = get_object_or_404(User, pk=self.kwargs["pk"])
        ids = Follow.objects.filter(following=user).values("follower_id")
        return users_with_stats(self.request.user).filter(pk__in=ids).order_by("username")


class FollowingListView(generics.ListAPIView):
    """GET /api/users/{id}/following/"""

    serializer_class = UserSummarySerializer

    def get_queryset(self):
        user = get_object_or_404(User, pk=self.kwargs["pk"])
        ids = Follow.objects.filter(follower=user).values("following_id")
        return users_with_stats(self.request.user).filter(pk__in=ids).order_by("username")


class UserSearchView(generics.ListAPIView):
    """GET /api/search/users/?q=  – match username or full name."""

    serializer_class = UserSummarySerializer

    def get_queryset(self):
        query = self.request.query_params.get("q", "").strip().lstrip("@")
        if not query:
            return User.objects.none()
        return (
            users_with_stats(self.request.user)
            .filter(Q(username__icontains=query) | Q(profile__full_name__icontains=query))
            .order_by("-followers_count", "username")
        )
