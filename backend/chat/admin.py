from django.contrib import admin

from .models import Conversation, Message, Reaction


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ("sender", "text", "image", "vibe", "created_at", "read_at")
    readonly_fields = ("created_at",)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "user_a", "user_b", "updated_at")
    search_fields = ("user_a__username", "user_b__username")
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "sender", "conversation", "short_text", "created_at", "read_at")
    search_fields = ("text", "sender__username")

    @admin.display(description="Text")
    def short_text(self, obj):
        return obj.preview


admin.site.register(Reaction)
