from django.urls import path

from . import views

urlpatterns = [
    # Authentication
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    # Current user's profile
    path("profile/", views.ProfileView.as_view(), name="profile"),
    # Members + follow system
    path("users/", views.UserListView.as_view(), name="user-list"),
    path("users/<int:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path("users/<int:pk>/follow/", views.FollowView.as_view(), name="user-follow"),
    path("users/<int:pk>/followers/", views.FollowersListView.as_view(), name="user-followers"),
    path("users/<int:pk>/following/", views.FollowingListView.as_view(), name="user-following"),
    # Search
    path("search/users/", views.UserSearchView.as_view(), name="user-search"),
]
