from rest_framework import serializers

from users.serializers import UserSummarySerializer, absolute_media_url, validate_image_upload

from .models import Comment, Post, Vibe


def vibe_info(key):
    """{'key': 'hyped', 'emoji': '🔥', 'label': 'Hyped'} or None."""
    if not key:
        return None
    emoji, label = Vibe(key).label.split(" ", 1)
    return {"key": key, "emoji": emoji, "label": label}


class CommentSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "post", "author", "content", "created_at", "is_owner"]
        read_only_fields = ["id", "post", "author", "created_at", "is_owner"]

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Comment can't be empty.")
        return value

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and obj.author_id == request.user.pk)


class PostSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)
    content = serializers.CharField(max_length=500, allow_blank=True, required=False)
    image = serializers.ImageField(required=False, allow_null=True, write_only=True)
    image_url = serializers.SerializerMethodField()
    vibe = serializers.ChoiceField(choices=Vibe.choices, required=False, allow_blank=True)
    vibe_info = serializers.SerializerMethodField()
    like_count = serializers.IntegerField(read_only=True, default=0)
    comment_count = serializers.IntegerField(read_only=True, default=0)
    is_liked = serializers.BooleanField(read_only=True, default=False)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id", "author", "content", "image", "image_url", "vibe", "vibe_info",
            "created_at", "like_count", "comment_count", "is_liked", "is_owner",
        ]
        read_only_fields = ["id", "author", "created_at"]

    def get_image_url(self, obj):
        return absolute_media_url(self.context.get("request"), obj.image)

    def get_vibe_info(self, obj):
        return vibe_info(obj.vibe)

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and obj.author_id == request.user.pk)

    def validate_image(self, value):
        return validate_image_upload(value) if value else value

    def validate(self, attrs):
        if "content" in attrs:
            attrs["content"] = attrs["content"].strip()
        # A post needs text or an image, both when created and when edited.
        if self.instance is None:
            is_empty = not attrs.get("content") and not attrs.get("image")
        else:
            is_empty = "content" in attrs and not attrs["content"] and not self.instance.image
        if is_empty:
            raise serializers.ValidationError({"content": "Your post can't be empty."})
        return attrs
