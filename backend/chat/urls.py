from django.urls import path

from . import views

urlpatterns = [
    path("chats/", views.ChatListView.as_view(), name="chat-list"),
    path("chats/contacts/", views.ContactsView.as_view(), name="chat-contacts"),
    path("chats/unread/", views.UnreadView.as_view(), name="chat-unread"),
    path("chats/<int:pk>/messages/", views.MessagesView.as_view(), name="chat-messages"),
    path("chats/<int:pk>/typing/", views.TypingView.as_view(), name="chat-typing"),
    path("messages/<int:pk>/", views.MessageDetailView.as_view(), name="message-detail"),
    path("messages/<int:pk>/react/", views.ReactView.as_view(), name="message-react"),
]
