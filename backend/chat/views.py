"""
Private 1-to-1 chat.

Rule: only people who follow each other (mutual followers) can start a chat
or send messages. If one of them unfollows later, the old messages stay
readable but nobody can send new ones until they follow each other again.

The frontend polls these endpoints (every few seconds while a chat is open),
because PythonAnywhere's free plan doesn't support WebSockets.
"""

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from users.queries import are_mutual, mutual_ids
from users.serializers import UserSummarySerializer

from .models import Conversation, Message, Reaction
from .serializers import MessageSerializer, conversation_data

User = get_user_model()
PAGE = 40
NOT_MUTUAL = "You can only message people you follow each other with."


def my_conversations(user):
    return Conversation.objects.filter(Q(user_a=user) | Q(user_b=user)).select_related(
        "user_a__profile", "user_b__profile"
    )


def get_conversation(user, pk):
    """The conversation, only if `user` is part of it (otherwise 404)."""
    return get_object_or_404(my_conversations(user), pk=pk)


def messages_qs(conversation):
    return conversation.messages.prefetch_related("reactions")


class ChatListView(APIView):
    """
    GET  /api/chats/              – your conversations, newest first
    POST /api/chats/ {user_id}    – open (or create) the chat with a mutual follower
    """

    def get(self, request):
        me = request.user
        mutual = set(mutual_ids(me).values_list("follower_id", flat=True))
        conversations = (
            my_conversations(me).filter(messages__isnull=False)
            .annotate(unread=Count("messages", filter=Q(messages__read_at__isnull=True) & ~Q(messages__sender=me)))
            .order_by("-updated_at").distinct()[:100]
        )
        data = []
        for conv in conversations:
            last = conv.messages.order_by("-created_at", "-id").first()
            data.append(conversation_data(conv, me, request, unread=conv.unread, last=last,
                                          can_message=conv.other(me).pk in mutual))
        return Response(data)

    def post(self, request):
        me = request.user
        target = get_object_or_404(User, pk=request.data.get("user_id"), is_active=True)
        if target == me:
            return Response({"detail": "You can't chat with yourself."}, status=status.HTTP_400_BAD_REQUEST)
        if not are_mutual(me, target):
            return Response({"detail": NOT_MUTUAL}, status=status.HTTP_403_FORBIDDEN)
        conv = Conversation.between(me, target)
        return Response(conversation_data(conv, me, request, can_message=True))


class ContactsView(APIView):
    """GET /api/chats/contacts/ – everyone you can message (mutual followers)."""

    def get(self, request):
        people = (
            User.objects.filter(pk__in=mutual_ids(request.user), is_active=True)
            .select_related("profile").order_by("profile__full_name", "username")[:200]
        )
        return Response(UserSummarySerializer(people, many=True, context={"request": request}).data)


class MessagesView(APIView):
    """
    GET  /api/chats/{id}/messages/            – latest 40 messages (+ marks theirs as read)
         ?before=<message id>                  – older messages, for "load earlier"
    POST /api/chats/{id}/messages/            – send (multipart: text, image, vibe)
    """

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        me = request.user
        conv = get_conversation(me, pk)
        qs = messages_qs(conv)
        before = request.query_params.get("before")
        if before and before.isdigit():
            qs = qs.filter(id__lt=int(before))
        else:
            # Opening/refreshing the chat reads everything they sent you
            conv.messages.filter(read_at__isnull=True).exclude(sender=me).update(read_at=timezone.now())
        page = list(qs.order_by("-created_at", "-id")[: PAGE + 1])
        has_more = len(page) > PAGE
        page = list(reversed(page[:PAGE]))
        ctx = {"request": request}
        return Response({
            "conversation": conversation_data(conv, me, request, can_message=are_mutual(me, conv.other(me))),
            "messages": MessageSerializer(page, many=True, context=ctx).data,
            "has_more": has_more,
        })

    def post(self, request, pk):
        me = request.user
        conv = get_conversation(me, pk)
        if not are_mutual(me, conv.other(me)):
            return Response({"detail": NOT_MUTUAL}, status=status.HTTP_403_FORBIDDEN)
        serializer = MessageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        message = serializer.save(conversation=conv, sender=me)
        conv.updated_at = message.created_at
        conv.save(update_fields=["updated_at"])
        conv.mark_typing(me, typing=False)
        return Response(MessageSerializer(message, context={"request": request}).data, status=status.HTTP_201_CREATED)


class MessageDetailView(APIView):
    """DELETE /api/messages/{id}/ – delete your own message."""

    def delete(self, request, pk):
        message = get_object_or_404(Message, pk=pk, conversation__in=my_conversations(request.user))
        if message.sender_id != request.user.pk:
            return Response({"detail": "You can only delete your own messages."}, status=status.HTTP_403_FORBIDDEN)
        if message.image:
            message.image.delete(save=False)
        message.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReactView(APIView):
    """
    POST /api/messages/{id}/react/ {emoji}
    Tap the same emoji again to remove it; a different one replaces yours.
    """

    def post(self, request, pk):
        message = get_object_or_404(Message, pk=pk, conversation__in=my_conversations(request.user))
        emoji = request.data.get("emoji")
        if emoji not in Reaction.EMOJIS:
            return Response({"detail": "Unknown reaction."}, status=status.HTTP_400_BAD_REQUEST)
        existing = Reaction.objects.filter(message=message, user=request.user).first()
        if existing and existing.emoji == emoji:
            existing.delete()
        elif existing:
            existing.emoji = emoji
            existing.save(update_fields=["emoji"])
        else:
            Reaction.objects.create(message=message, user=request.user, emoji=emoji)
        message = messages_qs(message.conversation).get(pk=message.pk)
        return Response(MessageSerializer(message, context={"request": request}).data)


class TypingView(APIView):
    """POST /api/chats/{id}/typing/ – "I'm typing" (lasts 5 seconds)."""

    def post(self, request, pk):
        get_conversation(request.user, pk).mark_typing(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UnreadView(APIView):
    """GET /api/chats/unread/ – unread total + the newest unread messages (for pop-ups)."""

    def get(self, request):
        me = request.user
        unread = (
            Message.objects.filter(conversation__in=my_conversations(me), read_at__isnull=True)
            .exclude(sender=me).select_related("sender__profile").order_by("-id")
        )
        ctx = {"request": request}
        latest = [
            {
                "id": m.pk,
                "conversation": m.conversation_id,
                "preview": m.preview,
                "sender": UserSummarySerializer(m.sender, context=ctx).data,
                "created_at": m.created_at,
            }
            for m in unread[:5]
        ]
        return Response({
            "total": unread.count(),
            "chats": unread.values("conversation_id").distinct().count(),
            "latest": latest,
        })
