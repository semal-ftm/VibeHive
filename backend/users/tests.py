from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Follow

User = get_user_model()
PASSWORD = "Sup3r-Secret-Pass"


def make_user(username):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password=PASSWORD)


class AuthTests(APITestCase):
    def test_register_returns_token_and_hashes_password(self):
        res = self.client.post("/api/register/", {
            "username": "newbee", "email": "newbee@example.com", "full_name": "New Bee",
            "password": PASSWORD, "password_confirm": PASSWORD,
        }, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertIn("token", res.data)
        self.assertEqual(res.data["user"]["full_name"], "New Bee")
        user = User.objects.get(username="newbee")
        self.assertNotEqual(user.password, PASSWORD)
        self.assertTrue(user.check_password(PASSWORD))

    def test_register_rejects_duplicates_and_weak_passwords(self):
        make_user("taken")
        res = self.client.post("/api/register/", {
            "username": "TAKEN", "email": "taken@example.com",
            "password": "12345678", "password_confirm": "12345678",
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("username", res.data)
        self.assertIn("email", res.data)

    def test_register_password_mismatch(self):
        res = self.client.post("/api/register/", {
            "username": "someone", "email": "someone@example.com",
            "password": PASSWORD, "password_confirm": PASSWORD + "x",
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("password_confirm", res.data)

    def test_login_with_username_or_email_and_logout(self):
        make_user("bee")
        for identifier in ("bee", "bee@example.com"):
            res = self.client.post("/api/login/", {"identifier": identifier, "password": PASSWORD}, format="json")
            self.assertEqual(res.status_code, 200)
        token = res.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        self.assertEqual(self.client.post("/api/logout/").status_code, 204)
        self.assertFalse(Token.objects.filter(key=token).exists())

    def test_invalid_login(self):
        make_user("bee")
        res = self.client.post("/api/login/", {"identifier": "bee", "password": "wrong"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_protected_endpoints_require_auth(self):
        self.assertEqual(self.client.get("/api/posts/").status_code, 401)
        self.assertEqual(self.client.get("/api/profile/").status_code, 401)


class FollowAndProfileTests(APITestCase):
    def setUp(self):
        self.alice = make_user("alice")
        self.bob = make_user("bob")
        self.client.force_authenticate(self.alice)

    def test_follow_unfollow_and_counts(self):
        res = self.client.post(f"/api/users/{self.bob.id}/follow/")
        self.assertEqual(res.data, {"following": True, "followers_count": 1, "mutual": False})
        # Following twice doesn't create a duplicate
        self.client.post(f"/api/users/{self.bob.id}/follow/")
        self.assertEqual(Follow.objects.filter(follower=self.alice, following=self.bob).count(), 1)

        profile = self.client.get(f"/api/users/{self.bob.id}/").data
        self.assertTrue(profile["is_following"])
        self.assertEqual(profile["followers_count"], 1)
        self.assertIsNone(profile["email"])  # email stays private

        res = self.client.delete(f"/api/users/{self.bob.id}/follow/")
        self.assertEqual(res.data, {"following": False, "followers_count": 0, "mutual": False})

    def test_cannot_follow_yourself(self):
        res = self.client.post(f"/api/users/{self.alice.id}/follow/")
        self.assertEqual(res.status_code, 400)
        self.assertFalse(Follow.objects.exists())

    def test_update_profile(self):
        res = self.client.put("/api/profile/", {"full_name": "Alice Bee", "bio": "Hello hive"}, format="multipart")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["full_name"], "Alice Bee")
        self.assertEqual(res.data["bio"], "Hello hive")

    def test_search_by_username_and_full_name(self):
        self.bob.profile.full_name = "Robert Builder"
        self.bob.profile.save()
        self.assertEqual(len(self.client.get("/api/search/users/?q=bob").data["results"]), 1)
        self.assertEqual(len(self.client.get("/api/search/users/?q=builder").data["results"]), 1)
        self.assertEqual(len(self.client.get("/api/search/users/?q=nobody").data["results"]), 0)

    def test_suggestions_exclude_self_and_followed(self):
        carol = make_user("carol")
        Follow.objects.create(follower=self.alice, following=self.bob)
        ids = [u["id"] for u in self.client.get("/api/users/?suggested=1").data["results"]]
        self.assertEqual(ids, [carol.id])
