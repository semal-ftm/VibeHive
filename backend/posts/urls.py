from django.urls import path

from . import views

urlpatterns = [
    path("posts/", views.PostListCreateView.as_view(), name="post-list"),
    path("posts/<int:pk>/", views.PostDetailView.as_view(), name="post-detail"),
    path("posts/<int:pk>/like/", views.LikeView.as_view(), name="post-like"),
    path("posts/<int:pk>/comments/", views.CommentListCreateView.as_view(), name="post-comments"),
    path("comments/<int:pk>/", views.CommentDetailView.as_view(), name="comment-detail"),
    path("trending/", views.TrendingView.as_view(), name="trending"),
    path("vibes/", views.VibeListView.as_view(), name="vibes"),
    path("notifications/", views.NotificationsView.as_view(), name="notifications"),
    # Vibe Match + Vibe Calendar
    path("vibe-matches/", views.VibeMatchesView.as_view(), name="vibe-matches"),
    path("users/<int:pk>/vibe-match/", views.VibeMatchView.as_view(), name="vibe-match"),
    path("users/<int:pk>/vibe-calendar/", views.VibeCalendarView.as_view(), name="vibe-calendar"),
]
