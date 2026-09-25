from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


def absolute_media_url(request, file_field):
    """Turn an ImageField value into a full URL the frontend can load."""
    if not file_field:
        return None
    url = file_field.url
    return request.build_absolute_uri(url) if request else url


def validate_image_upload(image):
    """Shared validation for avatar and post images."""
    if image.size > settings.MAX_UPLOAD_SIZE:
        raise serializers.ValidationError("Image is too large. The maximum size is 5 MB.")
    content_type = getattr(image, "content_type", "") or ""
    if content_type and not content_type.startswith("image/"):
        raise serializers.ValidationError("Only image files can be uploaded.")
    return image


# ---------------------------------------------------------------------------
# Read serializers
# ---------------------------------------------------------------------------
class UserSummarySerializer(serializers.ModelSerializer):
    """Compact user info used in cards, comments, search results and posts."""

    full_name = serializers.CharField(source="profile.full_name", read_only=True)
    bio = serializers.CharField(source="profile.bio", read_only=True)
    avatar = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    is_me = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "full_name", "bio", "avatar",
            "is_following", "is_me", "followers_count",
        ]

    def get_avatar(self, obj):
        return absolute_media_url(self.context.get("request"), obj.profile.avatar)

    def get_is_following(self, obj):
        # Only present when the queryset was annotated (see users/queries.py)
        return getattr(obj, "is_following", None)

    def get_is_me(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.pk == obj.pk)

    def get_followers_count(self, obj):
        return getattr(obj, "followers_count", None)


class UserDetailSerializer(UserSummarySerializer):
    """Full public profile, plus private fields when viewing yourself."""

    date_joined = serializers.DateTimeField(read_only=True)
    posts_count = serializers.IntegerField(read_only=True)
    following_count = serializers.IntegerField(read_only=True)
    follows_you = serializers.SerializerMethodField()
    is_mutual = serializers.SerializerMethodField()
    can_see_posts = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta(UserSummarySerializer.Meta):
        fields = UserSummarySerializer.Meta.fields + [
            "date_joined", "posts_count", "following_count", "follows_you",
            "is_mutual", "can_see_posts", "email",
        ]

    def get_follows_you(self, obj):
        return getattr(obj, "follows_you", None)

    def get_is_mutual(self, obj):
        return bool(getattr(obj, "is_following", False) and getattr(obj, "follows_you", False))

    def get_can_see_posts(self, obj):
        # Posts are shared only between mutual followers (and with yourself)
        return self.get_is_me(obj) or self.get_is_mutual(obj)

    def get_email(self, obj):
        # Email is private: only the owner sees it
        return obj.email if self.get_is_me(obj) else None


# ---------------------------------------------------------------------------
# Auth serializers
# ---------------------------------------------------------------------------
class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(
        min_length=3, max_length=30, validators=[UnicodeUsernameValidator()]
    )
    email = serializers.EmailField(max_length=254)
    full_name = serializers.CharField(max_length=80, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        # Run Django's configured password validators (length, common, numeric...)
        candidate = User(username=attrs["username"], email=attrs["email"])
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],  # hashed by create_user
        )
        full_name = validated_data.get("full_name", "").strip()
        if full_name:
            user.profile.full_name = full_name
            user.profile.save(update_fields=["full_name"])
        return user


class LoginSerializer(serializers.Serializer):
    """Log in with either username or email."""

    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        identifier = attrs["identifier"].strip()
        username = identifier
        if "@" in identifier:
            match = User.objects.filter(email__iexact=identifier).first()
            username = match.username if match else identifier
        user = authenticate(
            request=self.context.get("request"), username=username, password=attrs["password"]
        )
        if user is None:
            raise serializers.ValidationError("Invalid username/email or password.")
        attrs["user"] = user
        return attrs


# ---------------------------------------------------------------------------
# Profile update
# ---------------------------------------------------------------------------
class ProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=80, required=False, allow_blank=True)
    bio = serializers.CharField(max_length=280, required=False, allow_blank=True)
    avatar = serializers.ImageField(required=False, allow_null=True)
    remove_avatar = serializers.BooleanField(required=False, default=False)

    def validate_avatar(self, value):
        return validate_image_upload(value) if value else value

    def update(self, profile, validated_data):
        for field in ("full_name", "bio"):
            if field in validated_data:
                setattr(profile, field, validated_data[field].strip())
        if validated_data.get("remove_avatar") and profile.avatar:
            profile.avatar.delete(save=False)
            profile.avatar = None
        if validated_data.get("avatar"):
            if profile.avatar:
                profile.avatar.delete(save=False)
            profile.avatar = validated_data["avatar"]
        profile.save()
        return profile
