# 🚀 Put VibeHive online and on your phone

This guide takes VibeHive from your laptop to:

1. **A live website**: a link like `https://yourname.pythonanywhere.com` that works anywhere
2. **An installable phone app (PWA)**: add it to the home screen straight from that link
3. **An Android app file (APK)**: a real app you can install or share

Do the parts in order. Part 2 needs Part 1, and Part 3 needs Part 1.

> 💡 Everywhere below, replace **`yourname`** with your PythonAnywhere username.

---

## Part 1: Deploy the backend to PythonAnywhere (free)

PythonAnywhere runs Django for free and keeps your SQLite database and uploaded photos between restarts.

### 1.1 Create an account
1. Go to **https://www.pythonanywhere.com** and click **Pricing & signup → Create a Beginner account** (free).
2. Your site will live at `https://yourname.pythonanywhere.com`.

### 1.2 Upload the project
Choose **one** option.

**Option A: GitHub (recommended)**
1. Put the `VibeHive` folder in a GitHub repository.
2. On PythonAnywhere, open **Consoles → Bash** and run:
   ```bash
   git clone https://github.com/<your-github-name>/<your-repo>.git VibeHive
   ```

**Option B: Zip upload**
1. On your laptop, zip the `VibeHive` folder. Leave out `mobile/node_modules`, `mobile/android` and `backend/media`, because they're big and not needed on the server.
2. On PythonAnywhere, open **Files** and upload the zip to `/home/yourname/`.
3. Open **Consoles → Bash** and run:
   ```bash
   unzip VibeHive.zip -d ~ && ls ~/VibeHive
   ```

### 1.3 Install Python packages
In the same Bash console:
```bash
cd ~/VibeHive/backend
mkvirtualenv vibehive --python=python3.11
pip install -r requirements.txt
```
> If you close the console, run `workon vibehive` to get back into the virtual environment.

### 1.4 Create the settings file (`.env`)
```bash
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(50))"   # copy the random key it prints
nano .env
```
Fill it in like this, then press **Ctrl+O** and **Enter** to save, and **Ctrl+X** to exit:
```
DJANGO_SECRET_KEY=<paste the random key>
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=yourname.pythonanywhere.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://yourname.pythonanywhere.com
DJANGO_CORS_ORIGINS=
```

### 1.5 Set up the database
```bash
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py seed_demo          # optional: demo members, posts and photos (skip this for real users)
python manage.py createsuperuser    # optional: an account for /admin/
```

### 1.6 Create the web app
1. Open the **Web** tab and click **Add a new web app → Next → Manual configuration → Python 3.11**.
2. On the web app page, fill in:

   | Setting | Value |
   |---|---|
   | **Source code** | `/home/yourname/VibeHive/backend` |
   | **Working directory** | `/home/yourname/VibeHive/backend` |
   | **Virtualenv** | `/home/yourname/.virtualenvs/vibehive` |

3. Click the **WSGI configuration file** link, **delete everything** in it, and paste this:
   ```python
   import os
   import sys

   path = "/home/yourname/VibeHive/backend"
   if path not in sys.path:
       sys.path.insert(0, path)

   os.environ["DJANGO_SETTINGS_MODULE"] = "vibehive.settings"

   from django.core.wsgi import get_wsgi_application
   application = get_wsgi_application()
   ```
   Click **Save**.
4. Under **Static files**, add these two mappings. They make photos and admin styles load faster:

   | URL | Directory |
   |---|---|
   | `/static/` | `/home/yourname/VibeHive/backend/staticfiles` |
   | `/media/` | `/home/yourname/VibeHive/backend/media` |

5. Under **Security**, switch **Force HTTPS** **on**. The PWA and the Android app both need HTTPS.
6. Scroll to the top and click the green **Reload** button.

🎉 Open **https://yourname.pythonanywhere.com**. VibeHive is live.

### Launching for real users
Before you share the link with real people, remove the fictional demo accounts:
```bash
python manage.py seed_demo --remove
```
This deletes **only** the 8 demo members and everything they posted. Real accounts, including your admin, are not touched.

### 1.7 Updating the site later
```bash
workon vibehive
cd ~/VibeHive && git pull            # or upload the changed files
cd backend
python manage.py migrate
python manage.py collectstatic --noinput
```
Then click **Reload** on the Web tab.
> If you changed the frontend, first increase `VERSION` in `frontend/sw.js` (for example `vibehive-v2`) so installed apps download the new files.

### Good to know (free plan)
- Free web apps must be **renewed every 3 months**. PythonAnywhere emails you, and you click "Run until 3 months from today" on the Web tab.
- If something breaks, check the **error log** link on the Web tab. It shows the exact Python error.

---

## Part 2: Install VibeHive on a phone (PWA)

No extra setup is needed. The site is already a Progressive Web App.

**Android (Chrome)**
1. Open `https://yourname.pythonanywhere.com`.
2. Tap the **⬇ Install** button in the top bar, or use Chrome's menu **⋮ → Install app / Add to Home screen**.
3. VibeHive appears on the home screen with its own icon and opens full-screen.

**iPhone (Safari)**
1. Open the site in **Safari**.
2. Tap the **⬇** button in VibeHive's top bar for instructions, or tap **Share → Add to Home Screen** yourself.

**What the installed app does**
- Keeps you **logged in**. Reopening it goes straight back to your own feed and profile.
- **Remembers every account** that logged in on that phone. Tap one to continue, or switch accounts from the 👥 menu.
- Opens instantly because the app files are cached, and shows a friendly screen when offline.

---

## Part 3: Build the Android app (APK)

The `mobile/` folder wraps the same frontend in a real Android app using **Capacitor**.

### 3.1 One-time setup on your laptop
1. Install **Android Studio**: https://developer.android.com/studio. It includes the Android SDK. During the first launch, accept the default "Standard" setup.
2. **Node.js** is already installed on this laptop. Other laptops need Node 18+ from https://nodejs.org.

### 3.2 Point the app at your live backend
Open `frontend/js/config.js` and change this line to your address:
```js
const PRODUCTION_API = "https://yourname.pythonanywhere.com";
```

### 3.3 Build
```bash
cd mobile
npm install          # first time only
npm run sync         # copies ../frontend into the Android project
npm run open         # opens the project in Android Studio
```
In Android Studio:
1. Wait for **Gradle sync** to finish. The first time takes a few minutes.
2. Go to **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
3. Click **locate** in the popup. Your file is `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

**Install it on a phone:** send the APK to your phone (WhatsApp, Google Drive or USB) and open it. Android asks you to allow **"Install unknown apps"** once.

**Or test directly:** plug in your phone with USB debugging on, or start an emulator, then press the green ▶ **Run** button in Android Studio.

> Every time you change the frontend, run `npm run sync` again before building.

### 3.4 For the Google Play Store (optional)
Use **Build → Generate Signed App Bundle / APK**, create a keystore (keep it safe!), and upload the `.aab` file in the Google Play Console. A developer account costs a one-time $25.

### Notes
- The app's saved accounts and login live on the phone, so each person keeps their own profile between launches.
- `npm audit` reports a warning about the `tar` package used by the Capacitor 6 command-line tool. It only unpacks Capacitor's own built-in template on your laptop and is **not included in the app**. The newer `tar` release breaks Capacitor 6's `sync` command, so it stays pinned for now.
