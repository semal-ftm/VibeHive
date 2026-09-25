from django.contrib import admin

from .models import Comment, Like, Post


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "author", "vibe", "short_content", "created_at")
    list_filter = ("vibe", "created_at")
    search_fields = ("content", "author__username")
    inlines = [CommentInline]

    @admin.display(description="Content")
    def short_content(self, obj):
        return obj.content[:60]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("id", "author", "post", "content", "created_at")
    search_fields = ("content", "author__username")


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ("user", "post", "created_at")
