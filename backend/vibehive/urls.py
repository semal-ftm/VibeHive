"""
URL configuration for VibeHive.

    /api/...   JSON REST API (users + posts apps)
    /admin/    Django admin
    /media/    uploaded avatars and post images
    /          the frontend – served by WhiteNoise (see WHITENOISE_ROOT in settings)
"""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("users.urls")),
    path("api/", include("posts.urls")),
    path("api/", include("chat.urls")),
    # The home page; every other frontend file is served by WhiteNoise
    path("", serve, {"path": "index.html", "document_root": settings.FRONTEND_DIR}),
]

if settings.SERVE_MEDIA:
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    ]
