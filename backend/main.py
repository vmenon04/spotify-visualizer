from fastapi import FastAPI, Request, HTTPException, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
import requests
import numpy as np
import io
import os
import random
from dotenv import load_dotenv

load_dotenv() 

app = FastAPI()

SPOTIFY_API_BASE = "https://api.spotify.com/v1"
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "localhost:8000/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

# Store access & refresh tokens
TOKEN_STORAGE = {"access_token": None, "refresh_token": None}

print(f"🔍 DEBUG: Allowed Origin → {FRONTEND_URL}")  # ✅ Check if this is correct

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],\
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

@app.get("/")
def root():
    return {"message": "API is running"}

# Add the Set-Cookie header in the callback
@app.get("/callback")
def callback(request: Request, code: str = None):
    if not code:
        return JSONResponse({"error": "Missing authorization code"}, status_code=400)

    token_url = "https://accounts.spotify.com/api/token"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": SPOTIFY_REDIRECT_URI,
        "client_id": SPOTIFY_CLIENT_ID,
        "client_secret": SPOTIFY_CLIENT_SECRET,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    response = requests.post(token_url, data=data, headers=headers)
    token_info = response.json()

    if "access_token" in token_info:
        # Use cookies to store the token
        redirect = RedirectResponse(f"{FRONTEND_URL}")
        redirect.set_cookie(
            key="spotify_token",
            value=token_info["access_token"],
            httponly=True,  # Ensures the cookie is only accessible via HTTP requests
            secure=True,    # Ensures the cookie is only sent over HTTPS
            samesite="None",  # Prevents cross-site requests from sending the cookie
            domain="spotify-visualizer-api.onrender.com",
            max_age=3600    # Sets the cookie to expire in 1 hour
        )

        return redirect

    return JSONResponse({"error": "Authentication failed", "details": token_info}, status_code=400)




@app.get("/login")
def login():
    auth_url = (
        f"https://accounts.spotify.com/authorize?"
        f"client_id={SPOTIFY_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={SPOTIFY_REDIRECT_URI}"
        f"&scope=user-top-read%20user-library-read"
    )
    return RedirectResponse(auth_url)

from fastapi import Cookie

@app.get("/auth-status")
def auth_status(request: Request):
    cookies = request.cookies
    token = cookies.get("spotify_token")
    print(f"🔍 DEBUG: Cookies Received → {cookies}")  # Logs all cookies sent in the request
    is_logged_in = bool(token)
    print(f"🔍 DEBUG: Auth Check Response → logged_in: {is_logged_in}, token: {token}")
    return {"logged_in": is_logged_in, "token": token if is_logged_in else None}





@app.get("/get-token")
def get_token():
    if not TOKEN_STORAGE["access_token"]:
        raise HTTPException(status_code=401, detail="No token found")
    return {"access_token": TOKEN_STORAGE["access_token"]}

def get_headers():
    if not TOKEN_STORAGE["access_token"]:
        raise HTTPException(status_code=401, detail="Missing Spotify access token. Please log in.")
    return {"Authorization": f"Bearer {TOKEN_STORAGE['access_token']}"}

def refresh_access_token():
    if not TOKEN_STORAGE["refresh_token"]:
        raise HTTPException(status_code=401, detail="No refresh token available. Please log in again.")

    token_url = "https://accounts.spotify.com/api/token"
    payload = {
        "grant_type": "refresh_token",
        "refresh_token": TOKEN_STORAGE["refresh_token"],
        "client_id": SPOTIFY_CLIENT_ID,
        "client_secret": SPOTIFY_CLIENT_SECRET,
    }

    response = requests.post(token_url, data=payload)
    token_info = response.json()

    if "access_token" in token_info:
        TOKEN_STORAGE["access_token"] = token_info["access_token"]
    else:
        raise HTTPException(status_code=400, detail="Failed to refresh access token")

@app.get("/top-tracks")
def get_top_tracks():
    token = TOKEN_STORAGE.get("access_token")
    if not token:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get("https://api.spotify.com/v1/me/top/tracks?limit=25", headers=headers)
    data = response.json()
    
    if "items" not in data:
        return JSONResponse({"error": "Invalid response from Spotify"}, status_code=500)

    tracks = [
        {
            "name": track["name"],
            "artist": track["artists"][0]["name"],
            "album": track["album"]["name"],
            "image": track["album"]["images"][0]["url"],
            "id": track["id"],
        }
        for track in data["items"]
    ]
    return {"tracks": tracks}

@app.get("/taste-visualizer")
def get_visualizer_data():
    """Fetches all saved tracks and restores the y-axis to track duration."""
    try:
        all_tracks = []
        url = f"{SPOTIFY_API_BASE}/me/tracks?limit=50"

        while url:
            response = requests.get(url, headers=get_headers())
            data = response.json()

            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=data)

            if "items" not in data or not data["items"]:
                return {"error": "No saved tracks found"}

            all_tracks.extend(data["items"])
            url = data.get("next")  # Move to the next page, if available

        track_data = [
            {
                "name": item["track"]["name"],
                "artist": item["track"]["artists"][0]["name"],
                "image": item["track"]["album"]["images"][0]["url"],
                "x": item["track"]["popularity"],  # Popularity on X-axis
                "y": item["track"]["duration_ms"] / 1000,  # Duration (seconds) on Y-axis
                "explicit": item["track"]["explicit"],
                "release_year": item["track"]["album"]["release_date"][:4],
            }
            for item in all_tracks
        ]

        return {"tracks": track_data}

    except Exception as e:
        print("🚨 Error in taste-visualizer:", str(e))  # Debugging
        return {"error": str(e)}

@app.get("/generate-mosaic")
def generate_mosaic():
    """Fetch all saved album covers (not just 50) and generate a wild, abstract blended mosaic image."""
    try:
        token = TOKEN_STORAGE.get("access_token")
        if not token:
            raise HTTPException(status_code=401, detail="Unauthorized")

        headers = {"Authorization": f"Bearer {token}"}
        all_images = []
        url = f"{SPOTIFY_API_BASE}/me/tracks?limit=50"

        # ✅ Fetch ALL pages of saved tracks
        while url:
            response = requests.get(url, headers=headers)
            data = response.json()

            if "items" not in data or not data["items"]:
                break

            all_images.extend([track["track"]["album"]["images"][0]["url"] for track in data["items"] if track["track"]["album"]["images"]])
            url = data.get("next")  # Move to the next page

        if not all_images:
            raise HTTPException(status_code=404, detail="No album covers found.")

        # ✅ Use ALL retrieved images instead of limiting to 100
        image_size = 50
        images = [Image.open(io.BytesIO(requests.get(img_url).content)).resize((image_size, image_size), Image.LANCZOS).convert("RGBA") for img_url in all_images]

        mosaic_width = 6 * image_size
        mosaic_height = 6 * image_size
        mosaic = Image.new("RGBA", (mosaic_width, mosaic_height), (0, 0, 0, 255))

        # ✅ Layer images chaotically for a more abstract effect
        for i, img in enumerate(images):
            img = ImageEnhance.Brightness(img).enhance(random.uniform(0.7, 1.3))
            img = img.rotate(random.randint(0, 360), expand=True)
            img = img.resize((random.randint(100, image_size), random.randint(100, image_size)))
            img = ImageOps.solarize(img.convert('RGB'), threshold=random.randint(50, 150)).convert('RGBA')
            mask = Image.new("L", img.size, random.randint(100, 200))
            x = random.randint(0, mosaic_width - image_size)
            y = random.randint(0, mosaic_height - image_size)
            mosaic.paste(img, (x, y), mask)

        mosaic = mosaic.filter(ImageFilter.EDGE_ENHANCE_MORE)
        
        mosaic_path = "static/mosaic_wild.png"
        os.makedirs("static", exist_ok=True)
        mosaic.save(mosaic_path, quality=95)

        return FileResponse(mosaic_path, media_type="image/png")

    except Exception as e:
        print("🚨 Error generating mosaic:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/saved-tracks")
def get_saved_tracks():
    """
    Fetch all saved tracks and return album covers, track names, artist names, album names, release dates, durations, and popularity scores.
    """
    try:
        token = TOKEN_STORAGE.get("access_token")
        if not token:
            raise HTTPException(status_code=401, detail="Unauthorized")

        headers = {"Authorization": f"Bearer {token}"}
        all_tracks = []
        url = f"{SPOTIFY_API_BASE}/me/tracks?limit=50"

        # Fetch all saved tracks with pagination
        while url:
            response = requests.get(url, headers=headers)
            data = response.json()

            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=data)

            if "items" not in data or not data["items"]:
                break

            # Extract relevant track information
            all_tracks.extend([
                {
                    "image": track["track"]["album"]["images"][0]["url"],  # Album cover
                    "name": track["track"]["name"],  # Track name
                    "artist": ", ".join(artist["name"] for artist in track["track"]["artists"]),  # Artist(s) name
                    "album": track["track"]["album"]["name"],  # Album name
                    "release_date": track["track"]["album"]["release_date"],  # Release date
                    "duration": f"{track['track']['duration_ms'] // 60000}m {track['track']['duration_ms'] % 60000 // 1000}s",  # Duration in min:sec
                    "popularity": track["track"]["popularity"],  # Popularity (0-100)
                }
                for track in data["items"]
                if track["track"]["album"]["images"]
            ])

            # Get the next page URL
            url = data.get("next")

        if not all_tracks:
            raise HTTPException(status_code=404, detail="No saved tracks found.")

        return {"album_covers": all_tracks}

    except Exception as e:
        print("🚨 Error in /saved-tracks:", str(e))
        raise HTTPException(status_code=500, detail=str(e))