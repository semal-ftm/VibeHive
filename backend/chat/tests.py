from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from users.models import Follow

from .models import Conversation, Message

User = get_user_model()


def make_user(username):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="Sup3r-Secret-Pass")


def make_mutual(a, b):
    Follow.objects.get_or_create(follower=a, following=b)
    Follow.objects.get_or_create(follower=b, following=a)


class ChatTests(APITestCase):
    def setUp(self):
        self.alice = make_user("alice")
        self.bob = make_user("bob")
        self.carol = make_user("carol")
        make_mutual(self.alice, self.bob)
        self.client.force_authenticate(self.alice)

    def open_chat(self, user):
        return self.client.post("/api/chats/", {"user_id": user.id}, format="json")

    def send(self, conv_id, text="hi", **extra):
        return self.client.post(f"/api/chats/{conv_id}/messages/", {"text": text, **extra}, format="multipart")

    def test_only_mutual_followers_can_start_a_chat(self):
        self.assertEqual(self.open_chat(self.bob).status_code, 200)
        self.assertEqual(self.open_chat(self.carol).status_code, 403)
        Follow.objects.create(follower=self.alice, following=self.carol)  # one-way isn't enough
        self.assertEqual(self.open_chat(self.carol).status_code, 403)
        self.assertEqual(self.open_chat(self.alice).status_code, 400)

    def test_same_pair_gets_one_conversation(self):
        first = self.open_chat(self.bob).data["id"]
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.open_chat(self.alice).data["id"], first)
        self.assertEqual(Conversation.objects.count(), 1)

    def test_send_read_and_unread_counts(self):
        conv = self.open_chat(self.bob).data["id"]
        res = self.send(conv, "are you coming?", vibe="hyped")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["vibe_info"]["key"], "hyped")
        self.assertFalse(res.data["is_read"])
        self.assertEqual(self.send(conv, "   ").status_code, 400)

        self.client.force_authenticate(self.bob)
        unread = self.client.get("/api/chats/unread/").data
        self.assertEqual(unread["total"], 1)
        self.assertEqual(unread["latest"][0]["preview"], "are you coming?")
        self.assertEqual(self.client.get("/api/chats/").data[0]["unread"], 1)
        self.client.get(f"/api/chats/{conv}/messages/")  # opening the chat reads it
        self.assertEqual(self.client.get("/api/chats/unread/").data["total"], 0)

        self.client.force_authenticate(self.alice)
        msgs = self.client.get(f"/api/chats/{conv}/messages/").data["messages"]
        self.assertTrue(msgs[0]["is_read"])  # "Seen ✓✓"
        self.assertTrue(msgs[0]["is_mine"])

    def test_strangers_cannot_read_a_chat(self):
        conv = self.open_chat(self.bob).data["id"]
        msg = self.send(conv).data["id"]
        self.client.force_authenticate(self.carol)
        self.assertEqual(self.client.get(f"/api/chats/{conv}/messages/").status_code, 404)
        self.assertEqual(self.send(conv).status_code, 404)
        self.assertEqual(self.client.post(f"/api/messages/{msg}/react/", {"emoji": "❤️"}, format="json").status_code, 404)
        self.assertEqual(self.client.get("/api/chats/").data, [])

    def test_unfollowing_blocks_new_messages_but_keeps_history(self):
        conv = self.open_chat(self.bob).data["id"]
        self.send(conv, "hello")
        Follow.objects.filter(follower=self.bob, following=self.alice).delete()
        self.assertEqual(self.send(conv, "again").status_code, 403)
        data = self.client.get(f"/api/chats/{conv}/messages/").data
        self.assertFalse(data["conversation"]["can_message"])
        self.assertEqual(len(data["messages"]), 1)

    def test_reactions_toggle_and_replace(self):
        conv = self.open_chat(self.bob).data["id"]
        msg = self.send(conv).data["id"]
        self.client.force_authenticate(self.bob)
        react = lambda e: self.client.post(f"/api/messages/{msg}/react/", {"emoji": e}, format="json").data
        self.assertEqual(react("❤️")["reactions"], [{"emoji": "❤️", "count": 1, "mine": True}])
        self.assertEqual(react("😂")["reactions"], [{"emoji": "😂", "count": 1, "mine": True}])
        self.assertEqual(react("😂")["reactions"], [])
        self.assertEqual(self.client.post(f"/api/messages/{msg}/react/", {"emoji": "💩"}, format="json").status_code, 400)

    def test_only_sender_can_delete(self):
        conv = self.open_chat(self.bob).data["id"]
        msg = self.send(conv).data["id"]
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.delete(f"/api/messages/{msg}/").status_code, 403)
        self.client.force_authenticate(self.alice)
        self.assertEqual(self.client.delete(f"/api/messages/{msg}/").status_code, 204)
        self.assertFalse(Message.objects.exists())

    def test_typing_indicator_expires(self):
        conv_id = self.open_chat(self.bob).data["id"]
        self.client.post(f"/api/chats/{conv_id}/typing/")
        self.client.force_authenticate(self.bob)
        self.assertTrue(self.client.get(f"/api/chats/{conv_id}/messages/").data["conversation"]["other_typing"])
        conv = Conversation.objects.get(pk=conv_id)
        conv.a_typing_at = timezone.now() - timedelta(seconds=10)
        conv.b_typing_at = timezone.now() - timedelta(seconds=10)
        conv.save()
        self.assertFalse(self.client.get(f"/api/chats/{conv_id}/messages/").data["conversation"]["other_typing"])

    def test_contacts_are_mutual_followers(self):
        Follow.objects.create(follower=self.alice, following=self.carol)
        names = [u["username"] for u in self.client.get("/api/chats/contacts/").data]
        self.assertEqual(names, ["bob"])

    def test_load_earlier_messages(self):
        conv = self.open_chat(self.bob).data["id"]
        for i in range(45):
            self.send(conv, f"m{i}")
        page = self.client.get(f"/api/chats/{conv}/messages/").data
        self.assertEqual(len(page["messages"]), 40)
        self.assertTrue(page["has_more"])
        older = self.client.get(f"/api/chats/{conv}/messages/?before={page['messages'][0]['id']}").data
        self.assertEqual([m["text"] for m in older["messages"]], [f"m{i}" for i in range(5)])
        self.assertFalse(older["has_more"])
