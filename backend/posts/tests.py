from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from users.models import Follow

from .models import Comment, Like, Post

User = get_user_model()


def make_user(username):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="Sup3r-Secret-Pass")


def make_mutual(a, b):
    Follow.objects.get_or_create(follower=a, following=b)
    Follow.objects.get_or_create(follower=b, following=a)


class PostTests(APITestCase):
    def setUp(self):
        self.alice = make_user("alice")
        self.bob = make_user("bob")
        make_mutual(self.alice, self.bob)  # they can see each other's posts
        self.client.force_authenticate(self.alice)

    def test_create_post_with_vibe(self):
        res = self.client.post("/api/posts/", {"content": "Hello #hive", "vibe": "hyped"}, format="multipart")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["vibe_info"], {"key": "hyped", "emoji": "🔥", "label": "Hyped"})
        self.assertTrue(res.data["is_owner"])
        self.assertEqual(res.data["like_count"], 0)

    def test_empty_post_rejected(self):
        res = self.client.post("/api/posts/", {"content": "   "}, format="multipart")
        self.assertEqual(res.status_code, 400)

    def test_only_author_can_edit_or_delete(self):
        post = Post.objects.create(author=self.bob, content="Bob's post")
        self.assertEqual(self.client.delete(f"/api/posts/{post.id}/").status_code, 403)
        self.assertEqual(self.client.patch(f"/api/posts/{post.id}/", {"content": "hacked"}, format="json").status_code, 403)
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.patch(f"/api/posts/{post.id}/", {"content": "edited"}, format="json").data["content"], "edited")
        self.assertEqual(self.client.delete(f"/api/posts/{post.id}/").status_code, 204)

    def test_like_is_unique_and_toggles(self):
        post = Post.objects.create(author=self.bob, content="Like me")
        self.client.post(f"/api/posts/{post.id}/like/")
        res = self.client.post(f"/api/posts/{post.id}/like/")
        self.assertEqual(res.data, {"liked": True, "like_count": 1})
        self.assertEqual(Like.objects.count(), 1)
        self.assertTrue(self.client.get(f"/api/posts/{post.id}/").data["is_liked"])
        res = self.client.delete(f"/api/posts/{post.id}/like/")
        self.assertEqual(res.data, {"liked": False, "like_count": 0})

    def test_comments_and_ownership(self):
        post = Post.objects.create(author=self.bob, content="Comment here")
        res = self.client.post(f"/api/posts/{post.id}/comments/", {"content": "Nice!"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(len(self.client.get(f"/api/posts/{post.id}/comments/").data), 1)

        bob_comment = Comment.objects.create(post=post, author=self.bob, content="Mine")
        self.assertEqual(self.client.delete(f"/api/comments/{bob_comment.id}/").status_code, 403)
        self.assertEqual(self.client.delete(f"/api/comments/{res.data['id']}/").status_code, 204)

    def test_feed_and_filters_show_only_visible_posts(self):
        carol = make_user("carol")
        Post.objects.create(author=self.alice, content="mine", vibe="chill")
        Post.objects.create(author=self.bob, content="bob #django")
        Post.objects.create(author=carol, content="carol #django")

        feed = self.client.get("/api/posts/").data["results"]
        self.assertEqual({p["author"]["username"] for p in feed}, {"alice", "bob"})
        self.assertEqual(len(self.client.get("/api/posts/?vibe=chill").data["results"]), 1)
        self.assertEqual(len(self.client.get("/api/posts/?tag=django").data["results"]), 1)  # carol's is hidden
        self.assertEqual(len(self.client.get(f"/api/posts/?author={carol.id}").data["results"]), 0)

    def test_notifications_and_trending(self):
        post = Post.objects.create(author=self.alice, content="#buzz time", vibe="happy")
        Like.objects.create(user=self.bob, post=post)
        Comment.objects.create(post=post, author=self.bob, content="yay")

        types = sorted(n["type"] for n in self.client.get("/api/notifications/").data)
        self.assertEqual(types, ["comment", "follow", "like"])

        trending = self.client.get("/api/trending/").data
        self.assertEqual(trending["vibes"][0]["key"], "happy")
        self.assertEqual(trending["topics"][0]["tag"], "buzz")


class MutualVisibilityTests(APITestCase):
    """Posts are only visible between mutual followers."""

    def setUp(self):
        self.alice = make_user("alice")
        self.bob = make_user("bob")
        self.post = Post.objects.create(author=self.bob, content="Bob's secret vibe", vibe="chill")
        self.client.force_authenticate(self.alice)

    def assert_hidden(self):
        self.assertEqual(self.client.get("/api/posts/").data["results"], [])
        self.assertEqual(self.client.get(f"/api/posts/{self.post.id}/").status_code, 404)
        self.assertEqual(self.client.post(f"/api/posts/{self.post.id}/like/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/posts/{self.post.id}/comments/").status_code, 404)
        self.assertEqual(
            self.client.post(f"/api/posts/{self.post.id}/comments/", {"content": "hi"}, format="json").status_code, 404
        )
        self.assertTrue(self.client.get(f"/api/users/{self.bob.id}/vibe-calendar/").data["locked"])
        profile = self.client.get(f"/api/users/{self.bob.id}/").data
        self.assertFalse(profile["can_see_posts"])

    def test_strangers_cannot_see_posts(self):
        self.assert_hidden()

    def test_one_way_follow_is_not_enough(self):
        Follow.objects.create(follower=self.alice, following=self.bob)
        self.assert_hidden()
        # ...and it doesn't work the other way round either
        Follow.objects.filter(follower=self.alice).delete()
        Follow.objects.create(follower=self.bob, following=self.alice)
        self.assert_hidden()

    def test_mutual_followers_see_each_other(self):
        self.client.post(f"/api/users/{self.bob.id}/follow/")
        self.client.force_authenticate(self.bob)
        res = self.client.post(f"/api/users/{self.alice.id}/follow/")
        self.assertTrue(res.data["mutual"])
        self.client.force_authenticate(self.alice)
        self.assertEqual(len(self.client.get("/api/posts/").data["results"]), 1)
        self.assertEqual(self.client.get(f"/api/posts/{self.post.id}/").status_code, 200)
        self.assertEqual(self.client.post(f"/api/posts/{self.post.id}/like/").status_code, 200)
        profile = self.client.get(f"/api/users/{self.bob.id}/").data
        self.assertTrue(profile["is_mutual"])
        self.assertTrue(profile["can_see_posts"])

    def test_unfollowing_hides_posts_again(self):
        make_mutual(self.alice, self.bob)
        self.assertEqual(len(self.client.get("/api/posts/").data["results"]), 1)
        self.client.delete(f"/api/users/{self.bob.id}/follow/")
        self.assert_hidden()

    def test_you_always_see_your_own_posts(self):
        Post.objects.create(author=self.alice, content="my own")
        self.assertEqual(len(self.client.get("/api/posts/").data["results"]), 1)
        self.assertTrue(self.client.get(f"/api/users/{self.alice.id}/").data["can_see_posts"])


class VibeFeatureTests(APITestCase):
    def setUp(self):
        self.alice = make_user("alice")
        self.bob = make_user("bob")
        self.carol = make_user("carol")
        make_mutual(self.alice, self.bob)
        self.client.force_authenticate(self.alice)

    def add_posts(self, user, *vibes):
        for vibe in vibes:
            Post.objects.create(author=user, content=f"{vibe} post", vibe=vibe)

    def test_match_needs_enough_vibe_posts(self):
        self.add_posts(self.alice, "chill")
        self.add_posts(self.bob, "chill", "chill")
        data = self.client.get(f"/api/users/{self.bob.id}/vibe-match/").data
        self.assertIsNone(data["score"])
        self.assertEqual(data["me"]["total"], 1)

    def test_identical_vibes_score_100_and_opposites_score_0(self):
        self.add_posts(self.alice, "chill", "chill", "happy")
        self.add_posts(self.bob, "chill", "chill", "happy")
        self.add_posts(self.carol, "hyped", "funny")
        twin = self.client.get(f"/api/users/{self.bob.id}/vibe-match/").data
        self.assertEqual(twin["score"], 100)
        self.assertEqual(twin["label"], "Vibe twins")
        self.assertEqual(twin["shared"][0]["key"], "chill")
        opposite = self.client.get(f"/api/users/{self.carol.id}/vibe-match/").data
        self.assertEqual(opposite["score"], 0)

    def test_matches_list_is_ranked_and_excludes_zero(self):
        self.add_posts(self.alice, "chill", "chill", "happy")
        self.add_posts(self.bob, "chill", "happy", "happy")
        self.add_posts(self.carol, "hyped", "funny")
        data = self.client.get("/api/vibe-matches/").data
        self.assertTrue(data["ready"])
        self.assertEqual([m["user"]["username"] for m in data["results"]], ["bob"])

    def test_matches_locked_until_you_post_vibes(self):
        data = self.client.get("/api/vibe-matches/").data
        self.assertFalse(data["ready"])
        self.assertEqual(data["needed"], 2)

    def test_calendar_groups_posts_by_day(self):
        self.add_posts(self.bob, "hyped", "hyped", "chill")
        data = self.client.get(f"/api/users/{self.bob.id}/vibe-calendar/?weeks=4").data
        self.assertEqual(len(data["days"]), 1)
        today = data["days"][0]
        self.assertEqual(today["count"], 3)
        self.assertEqual(today["vibe"], "hyped")
        self.assertEqual(data["summary"]["top_vibe"]["key"], "hyped")
        self.assertEqual(data["summary"]["current_streak"], 1)
