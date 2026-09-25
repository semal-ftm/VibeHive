from collections import Counter

from rest_framework import serializers

from posts.models import Vibe
from posts.serializers import vibe_info
from users.serializers import UserSummarySerializer, absolute_media_url, validate_image_upload

from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    text = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    image = serializers.ImageField(required=False, allow_null=True, write_only=True)
    vibe = serializers.ChoiceField(choices=Vibe.choices, required=False, allow_blank=True)
    image_url = serializers.SerializerMethodField()
    vibe_info = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "text", "image", "image_url", "vibe", "vibe_info", "created_at",
                  "is_mine", "is_read", "reactions"]
        read_only_fields = ["id", "created_at"]

    def _me(self):
        return self.context["request"].user

    def get_image_url(self, obj):
        return absolute_media_url(self.context.get("request"), obj.image)

    def get_vibe_info(self, obj):
        return vibe_info(obj.vibe)

    def get_is_mine(self, obj):
        return obj.sender_id == self._me().pk

    def get_is_read(self, obj):
        return obj.read_at is not None

    def get_reactions(self, obj):
        """[{emoji: '❤️', count: 2, mine: true}, …] – uses prefetched reactions."""
        all_reactions = list(obj.reactions.all())
        counts = Counter(r.emoji for r in all_reactions)
        mine = {r.emoji for r in all_reactions if r.user_id == self._me().pk}
        return [{"emoji": e, "count": n, "mine": e in mine} for e, n in counts.most_common()]

    def validate_image(self, value):
        return validate_image_upload(value) if value else value

    def validate(self, attrs):
        attrs["text"] = (attrs.get("text") or "").strip()
        if not attrs["text"] and not attrs.get("image"):
            raise serializers.ValidationError({"text": "Write a message or add a photo."})
        return attrs


def conversation_data(conversation, me, request, unread=0, last=None, can_message=False):
    other = conversation.other(me)
    return {
        "id": conversation.pk,
        "other": UserSummarySerializer(other, context={"request": request}).data,
        "last_message": last and {
            "preview": last.preview,
            "is_mine": last.sender_id == me.pk,
            "created_at": last.created_at,
            "vibe": vibe_info(last.vibe),
        },
        "unread": unread,
        "updated_at": conversation.updated_at,
        "can_message": can_message,
        "other_typing": conversation.other_is_typing(me),
    }
