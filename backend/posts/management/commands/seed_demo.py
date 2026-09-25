"""
python manage.py seed_demo            add (or refresh) the fictional demo members
python manage.py seed_demo --remove   delete ONLY the demo members and everything
                                      they posted – real accounts are untouched

Fills the database with fictional demo members, posts, comments, likes and
follows so the hive looks alive during a demo. All people are made up.
Safe to run more than once: demo users are recreated each time.

Photos live in ./seed_assets (avatars = cute animals, nature = landscapes).
They are Unsplash photos served through Lorem Picsum; credits.json lists
every photographer.
"""

import random
from datetime import timedelta
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files import File
from django.core.management.base import BaseCommand
from django.utils import timezone

from posts.models import Comment, Like, Post
from users.models import Follow

User = get_user_model()
DEMO_PASSWORD = "HiveDemo2026!"
ASSETS = Path(__file__).resolve().parent / "seed_assets"

# username, full name, bio, avatar photo id (seed_assets/avatars/<id>.jpg)
MEMBERS = [
    ("demo", "Ali Raza", "Just here to try out VibeHive 🐝", 1025),
    ("ayesha.codes", "Ayesha Siddiqui", "Frontend dev from Lahore · CSS wizard · chai first ☕", 1062),
    ("hamza_designs", "Hamza Qureshi", "Product designer in Karachi. I push pixels and ideas.", 237),
    ("fatima.writes", "Fatima Malik", "Words, walks and way too many notebooks 📓", 1003),
    ("usman.builds", "Usman Tariq", "Backend engineer · Django fan · night owl 🌙", 659),
    ("zainab.clicks", "Zainab Hussain", "Chasing golden hour across the world 📷", 169),
    ("bilal.moves", "Bilal Chaudhry", "Runner from Islamabad · early riser · motivated daily 🚀", 433),
    ("mahnoor.learns", "Mahnoor Iqbal", "CS student learning something new every day.", 837),
]

# Demo accounts from older versions of this command, removed on re-seed
LEGACY_USERNAMES = [
    "sara.codes", "dan_designs", "emma.writes", "omar.builds",
    "lina.photo", "max.moves", "noor.learns",
]

# author, vibe, text, nature photo id (or None) – oldest first
POSTS = [
    ("usman.builds", "late_night", "2am and the API finally returns 200 everywhere. Tomorrow-me can write the tests 😅 #django #webdev", None),
    ("zainab.clicks", "late_night", "Stayed up till 3am and the sky started dancing 🌌 The northern lights are pure magic. #travel #nature", 901),
    ("hamza_designs", "inspired", "That peak looks like someone drew it with the pen tool ⛰️ Nature is still the best designer. #design #mountains", 906),
    ("ayesha.codes", "hyped", "Just shipped my first full dark mode toggle and it feels SO good 🌗 #webdev #css", None),
    ("bilal.moves", "motivated", "Hiked 4 hours for this view over the fjord. Every single step was worth it 🚀 #hiking #fitness", 1015),
    ("fatima.writes", "chill", "A lake so calm it feels like a deep breath 😌 #nature #travel", 916),
    ("mahnoor.learns", "hyped", "Got accepted into my first internship!! 🐝 So ready to learn. #internship #learning", None),
    ("zainab.clicks", "grateful", "Standing behind a waterfall is a feeling I can't explain. So grateful 💧 #photography #nature", 509),
    ("mahnoor.learns", "hyped", "Tiny humans, giant dunes 🔥 Desert trip: done! #travel #adventure", 525),
    ("usman.builds", "inspired", "Sunrise over a volcano crater. Woke up at 3am and zero regrets 🌋 #travel", 523),
    ("ayesha.codes", "funny", "Nature did CSS grid before any of us 😂 Look at these rock columns! #webdev #nature", 829),
    ("fatima.writes", "inspired", "\"Start where you are. Use what you have. Do what you can.\" Needed that today. #motivation", None),
    ("zainab.clicks", "chill", "Glacier lake, cold air, warm chai ☕ #mountains #photography", 873),
    ("fatima.writes", "inspired", "Found this hidden waterfall on a trail with no name 💚 #nature #writing", 1039),
    ("usman.builds", "focused", "Tip: use select_related and prefetch_related before you blame the database. #django", None),
    ("demo", "chill", "Perfect morning for doing absolutely nothing by the lake 😌 #weekend", 434),
    ("hamza_designs", "inspired", "The colours inside this canyon look like a gradient palette 🎨 #design", 564),
    ("ayesha.codes", "funny", "Me: I'll just fix one CSS bug.\nAlso me, 3 hours later: rewriting the whole layout in grid 😂 #css", None),
    ("bilal.moves", "happy", "Found a natural window to the sea 🌊 #travel #beach", 871),
    ("usman.builds", "late_night", "No city lights, just the Milky Way and me 🌙 #stargazing", 974),
    ("bilal.moves", "motivated", "5km before sunrise ✅ Day 30 of the streak. Small steps, every day. #fitness #habits", None),
    ("zainab.clicks", "grateful", "A rainbow at the waterfall 🌈 Some days just hand you gifts. #photography", 1035),
    ("mahnoor.learns", "grateful", "Ending the day with this sunset. Grateful for small beautiful moments 🌅 #sunset", 896),
    ("demo", "happy", "First week on VibeHive and the hive is already buzzing 🐝 #hello", None),
]

COMMENTS = [
    "Kya baat hai! 🔥", "MashaAllah, so beautiful 😍", "Wah, loved this!", "This is amazing 🔥",
    "Adding this to my bucket list ✈️", "So true 👏", "Congrats!! 🎉", "Needed to read this today.",
    "Chai pe milte hain soon? ☕", "Saving this for later 📌", "Looks unreal!", "Keep going 🚀",
]

# Each member's usual vibes (weights) – this is what makes Vibe Match meaningful
PERSONALITIES = {
    "demo": {"happy": 4, "chill": 3, "inspired": 3, "grateful": 1},
    "ayesha.codes": {"hyped": 5, "funny": 3, "focused": 2},
    "hamza_designs": {"inspired": 5, "happy": 2, "focused": 2},
    "fatima.writes": {"chill": 4, "inspired": 3, "grateful": 3},
    "usman.builds": {"late_night": 5, "focused": 3, "hyped": 2},
    "zainab.clicks": {"chill": 4, "grateful": 3, "happy": 3},
    "bilal.moves": {"motivated": 5, "happy": 2, "focused": 2},
    "mahnoor.learns": {"focused": 4, "hyped": 2, "motivated": 3},
}

HISTORY_LINES = {
    "happy": ["Small wins today and I'm smiling 😊", "Sunshine + good chai = perfect day ☀️", "Had the nicest chat with a stranger today."],
    "hyped": ["LET'S GO! Just hit a big milestone 🔥 #goals", "New project kicked off and I can't sit still!", "Launch day energy is unreal 🔥"],
    "inspired": ["Saw an idea today that rewired my brain 💡 #ideas", "Reading about great makers always sparks something.", "Sketched three new concepts before lunch 💡 #design"],
    "chill": ["Slow morning, soft music, no rush 😌", "Long walk and zero notifications. Bliss.", "Chai, book, blanket. That's the plan 😌 #weekend"],
    "grateful": ["Grateful for the people who check in on me ❤️", "Thankful for a team that has my back.", "Small reminder to thank someone today ❤️"],
    "focused": ["Deep work mode: phone in another room 🎯 #productivity", "Three hours of focus and the bug is finally gone.", "One task at a time. It works 🎯"],
    "funny": ["My code worked on the first try and now I'm scared 😂 #webdev", "Autocorrect changed 'meeting' to 'meowing'. Accurate.", "Tried to be productive, ended up reorganizing my desk 😂"],
    "late_night": ["2am thoughts: why do ideas only show up now? 🌙", "Night shift with lo-fi beats and a rubber duck 🌙 #coding", "Quiet streets, loud keyboard 🌙"],
    "motivated": ["Day by day, rep by rep 🚀 #habits", "Woke up early and actually used it 🚀", "Progress over perfection. Always 🚀 #motivation"],
}


def asset(kind, photo_id):
    """Open a bundled photo as a Django File ready for an ImageField."""
    path = ASSETS / kind / f"{photo_id}.jpg"
    return File(path.open("rb"), name=f"{kind}_{photo_id}.jpg")


def _demo_conversations(demo):
    from django.db.models import Q
    from chat.models import Conversation
    return Conversation.objects.filter(Q(user_a__in=demo) | Q(user_b__in=demo))


def remove_demo_users():
    """Delete the demo accounts plus their photos. Returns (users, posts) removed."""
    demo = User.objects.filter(username__in=[m[0] for m in MEMBERS] + LEGACY_USERNAMES)
    posts = Post.objects.filter(author__in=demo)
    post_count = posts.count()
    # Database rows cascade on delete, but image files must be removed by hand
    for post in posts.exclude(image=""):
        post.image.delete(save=False)
    from chat.models import Message  # chat photos in conversations with demo members
    for message in Message.objects.filter(conversation__in=_demo_conversations(demo)).exclude(image=""):
        message.image.delete(save=False)
    for user in demo.select_related("profile"):
        if user.profile.avatar:
            user.profile.avatar.delete(save=False)
    user_count = demo.count()
    demo.delete()  # also deletes their posts, comments, likes and follows
    return user_count, post_count


class Command(BaseCommand):
    help = "Populate VibeHive with fictional demo data (or remove it with --remove)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--remove", action="store_true",
            help="Delete only the demo members and their content; real accounts stay.",
        )

    def handle(self, *args, **options):
        if options["remove"]:
            users, posts = remove_demo_users()
            self.stdout.write(self.style.SUCCESS(
                f"Removed {users} demo members and {posts} demo posts. Real accounts were not touched."
            ))
            return

        rng = random.Random(42)
        remove_demo_users()

        users = {}
        for username, full_name, bio, avatar_id in MEMBERS:
            user = User.objects.create_user(
                username=username, email=f"{username.replace('.', '_')}@example.com",
                password=DEMO_PASSWORD,
            )
            profile = user.profile
            profile.full_name = full_name
            profile.bio = bio
            with asset("avatars", avatar_id) as photo:
                profile.avatar.save(photo.name, photo, save=False)
            profile.save()
            users[username] = user

        # Follows: everyone follows a handful of others, and most follow back.
        # Posts are only visible between mutual followers, so this keeps feeds lively.
        for user in users.values():
            others = [u for u in users.values() if u != user]
            for target in rng.sample(others, k=rng.randint(3, 5)):
                Follow.objects.get_or_create(follower=user, following=target)
                if rng.random() < 0.8:
                    Follow.objects.get_or_create(follower=target, following=user)

        now = timezone.now()
        for index, (username, vibe, content, photo_id) in enumerate(POSTS):
            post = Post(author=users[username], content=content, vibe=vibe)
            if photo_id:
                with asset("nature", photo_id) as photo:
                    post.image.save(photo.name, photo, save=False)
            post.save()
            created = now - timedelta(hours=(len(POSTS) - index) * 1.5, minutes=rng.randint(0, 50))
            Post.objects.filter(pk=post.pk).update(created_at=created)

            for liker in rng.sample(list(users.values()), k=rng.randint(1, len(users) - 1)):
                Like.objects.get_or_create(user=liker, post=post)
            for commenter in rng.sample(list(users.values()), k=rng.randint(0, 3)):
                if commenter != post.author:
                    Comment.objects.create(post=post, author=commenter, content=rng.choice(COMMENTS))

        # Months of history so every profile has a lively Vibe Calendar
        all_users = list(users.values())
        history = 0
        for username, weights in PERSONALITIES.items():
            author = users[username]
            vibes, w = zip(*weights.items())
            for days_ago in range(2, 170):
                if rng.random() > 0.3:  # active on roughly 30% of days
                    continue
                for _ in range(rng.choice([1, 1, 1, 2, 2, 3])):
                    vibe = rng.choices(vibes, weights=w)[0]
                    post = Post.objects.create(author=author, vibe=vibe, content=rng.choice(HISTORY_LINES[vibe]))
                    when = now - timedelta(days=days_ago, hours=rng.randint(0, 20), minutes=rng.randint(0, 59))
                    Post.objects.filter(pk=post.pk).update(created_at=when)
                    likers = [u for u in rng.sample(all_users, k=rng.randint(0, 4)) if u != author]
                    Like.objects.bulk_create([Like(user=u, post=post) for u in likers], ignore_conflicts=True)
                    history += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(users)} members, {len(POSTS)} recent posts and {history} older posts.\n"
            f"Log in as 'demo' (or any seeded user) with password: {DEMO_PASSWORD}"
        ))
