from fastapi import FastAPI, UploadFile, File, Body
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import torch
import torch.nn as nn
from torchvision import models, transforms
from tensorflow.keras.models import load_model
import numpy as np
from PIL import Image
from annoy import AnnoyIndex
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import io
import os
import json
import random
import smtplib
import time
import traceback
from email.mime.text import MIMEText
from pydantic import BaseModel
from typing import List
from collections import Counter

app = FastAPI()

# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/data", StaticFiles(directory="data"), name="data")

# =========================
# CONFIG
# =========================
DATA_PATH = "data"
EMBEDDING_DIM = 512
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

EMAIL_SENDER = "furniturefind.official@gmail.com"
EMAIL_APP_PASSWORD = "yfgofqqqjlxyslko"

OTP_EXPIRY_SECONDS = 60

otp_storage = {}

# =========================
# MODELS
# =========================
classification_model = load_model("best_convnext.keras")
class_names = sorted(os.listdir(DATA_PATH))

def preprocess_convnext(img_bytes):
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img = img.resize((224, 224))
    img = np.array(img) / 255.0
    
    # Apply ImageNet normalization as used during training
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    img = (img - mean) / std
    
    img = np.expand_dims(img, axis=0)
    return img

def classify_image(img_bytes):
    img_array = preprocess_convnext(img_bytes)
    preds = classification_model.predict(img_array, verbose=0)
    return class_names[np.argmax(preds)]

resnet = models.resnet18(pretrained=True)
resnet.fc = nn.Identity()
resnet = resnet.to(DEVICE)
resnet.eval()

transform_resnet = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

def extract_embedding(img_bytes):
    image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    image = transform_resnet(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        embedding = resnet(image)

    return embedding.cpu().numpy().flatten()

# =========================
# ANNOY
# =========================
annoy_indexes = {}
paths_mapping = {}

for class_name in class_names:
    folder = os.path.join(DATA_PATH, class_name)

    ann_path = os.path.join(folder, f"{class_name}.ann")
    json_path = os.path.join(folder, f"{class_name}_paths.json")

    if os.path.exists(ann_path) and os.path.exists(json_path):
        index = AnnoyIndex(EMBEDDING_DIM, "angular")
        index.load(ann_path)
        annoy_indexes[class_name] = index

        with open(json_path, "r") as f:
            paths_mapping[class_name] = json.load(f)

print("Indexes loaded ✅")

# =========================
# SIMILARITY
# =========================
def get_similar(embedding, predicted_class, k=5):
    index = annoy_indexes[predicted_class]
    ids, distances = index.get_nns_by_vector(embedding, 30, include_distances=True)

    paths = paths_mapping[predicted_class]

    unique = []
    seen = set()

    for i, d in zip(ids, distances):
        r = round(d, 4)
        if r not in seen:
            seen.add(r)
            unique.append(paths[i])
        if len(unique) == k:
            break

    return unique

# =========================
# HELPER
# =========================
def spaced(code):
    return " ".join(list(code))

# =========================
# TEXT SEARCH (TF-IDF)
# =========================
try:
    print("Loading furniture text data...")
    with open("furniture_data_final.json", "r", encoding="utf-8") as f:
        furniture_data = json.load(f)

    # Combine description and tags for better matching
    text_corpus = []
    for item in furniture_data:
        desc = item.get("description", "")
        tags = " ".join(item.get("tags", []))
        cat = item.get("category", "")
        text_corpus.append(f"{cat} {desc} {tags}")

    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(text_corpus)
    print("Text data loaded and vectorized ✅")
except Exception as e:
    print(f"Error loading text data: {e}")
    furniture_data = []

@app.get("/search-text")
async def search_text(query: str, k: int = 50):
    if not query.strip() or not furniture_data:
        return JSONResponse({"similar_items": [], "predicted_class": "Search Results"})
    
    query_vec = vectorizer.transform([query])
    sims = cosine_similarity(query_vec, tfidf_matrix).flatten()
    
    # Get top k indices
    top_indices = sims.argsort()[-k:][::-1]
    
    similar_items = []
    seen_images = set()
    seen_descriptions = set()
    for idx in top_indices:
        if sims[idx] > 0.05: # Threshold
            item = furniture_data[idx]
            img_path = item["image"]
            
            # Clean Kaggle path if present
            clean_path = img_path.replace('\\', '/')
            data_index = clean_path.find('data/')
            if data_index != -1:
                img_path = clean_path[data_index:] # becomes data/...
                
            desc = item.get("description", "").strip().lower()
            
            if img_path not in seen_images and desc not in seen_descriptions:
                seen_images.add(img_path)
                seen_descriptions.add(desc)
                similar_items.append({
                    "image": img_path,
                    "price": item.get("price", 199),
                    "category": item.get("category", "Search Results")
                })
                
                if len(similar_items) == 5:
                    break
            
            
    return JSONResponse({
        "similar_items": similar_items,
        "predicted_class": "Search Results"
    })

# =========================
# CHECKOUT API
# =========================
class PurchaseItem(BaseModel):
    imageUrl: str
    category: str
    price: float
    quantity: int

class CheckoutRequest(BaseModel):
    items: List[PurchaseItem]

@app.post("/checkout")
async def checkout(data: CheckoutRequest):
    purchases_file = "purchases.json"
    if os.path.exists(purchases_file):
        with open(purchases_file, "r", encoding="utf-8") as f:
            try:
                purchases = json.load(f)
            except:
                purchases = []
    else:
        purchases = []
        
    for item in data.items:
        purchases.append(item.dict())
        
    with open(purchases_file, "w", encoding="utf-8") as f:
        json.dump(purchases, f, indent=4, ensure_ascii=False)
        
    return JSONResponse({"status": "success", "message": "Checkout recorded"})

# =========================
# BEST SELLERS API
# =========================
@app.get("/best-sellers")
async def get_best_sellers(limit: int = 5):
    best_items = []
    purchases_file = "purchases.json"
    
    if os.path.exists(purchases_file):
        with open(purchases_file, "r", encoding="utf-8") as f:
            try:
                purchases = json.load(f)
            except:
                purchases = []
                
        # Count items by image URL
        item_counts = Counter(p["imageUrl"] for p in purchases)
        most_common = item_counts.most_common(limit)
        
        for img, count in most_common:
            # Find the first record to get its price and category
            for p in purchases:
                if p["imageUrl"] == img:
                    best_items.append({
                        "image": img,
                        "price": p.get("price", 199),
                        "category": p.get("category", "Best Seller"),
                        "purchases": count
                    })
                    break
                    
    # Fill the rest with random items if not enough purchases
    if len(best_items) < limit and furniture_data:
        random.seed(42)
        fallback_items = random.sample(furniture_data, min(limit, len(furniture_data)))
        random.seed()
        
        for item in fallback_items:
            if len(best_items) >= limit:
                break
                
            img_path = item.get("image", "")
            clean_path = img_path.replace('\\', '/')
            data_index = clean_path.find('data/')
            if data_index != -1:
                img_path = clean_path[data_index:]
                
            full_url = f"http://127.0.0.1:8000/{img_path}"
            
            # Prevent duplicates
            if not any(b["image"].endswith(img_path) or b["image"] == full_url for b in best_items):
                best_items.append({
                    "image": full_url,
                    "price": item.get("price", 199),
                    "category": item.get("category", "Best Seller")
                })
                
    return JSONResponse({"items": best_items[:limit]})

# =========================
# CATEGORIES API
# =========================
@app.get("/categories")
async def get_categories():
    # Return friendly names by stripping _dataset
    friendly_names = [c.replace("_dataset", "").replace(" dataset", "").replace("_", " ").title() for c in class_names]
    return JSONResponse({
        "categories": [{"id": c, "name": n} for c, n in zip(class_names, friendly_names)]
    })

import math

@app.get("/category-images")
async def get_category_images(category: str, page: int = 1, limit: int = 10):
    if category not in class_names:
        return JSONResponse({"error": "Category not found"}, status_code=404)
    
    paths = paths_mapping.get(category, [])
    if not paths:
        return JSONResponse({"images": [], "total_pages": 0, "current_page": page})
        
    # Sort for consistent pagination
    paths = sorted(paths)
    
    total_items = len(paths)
    total_pages = math.ceil(total_items / limit)
    
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_paths = paths[start_idx:end_idx]
    
    results = []
    for p in paginated_paths:
        clean_path = p.replace('\\', '/')
        
        # Extract relative path starting from category name (handles Kaggle paths)
        class_index = clean_path.find(category)
        if class_index != -1:
            clean_path = clean_path[class_index:]
        elif clean_path.startswith('data/'):
            clean_path = clean_path[5:]
            
        results.append(f"http://127.0.0.1:8000/data/{clean_path}")
        
    return JSONResponse({
        "images": results, 
        "category": category.replace("_dataset", "").replace(" dataset", "").replace("_", " ").title(),
        "total_pages": total_pages,
        "current_page": page
    })

# =========================
# SEND OTP
# =========================
@app.post("/send-code")
async def send_code(data: dict = Body(...)):
    try:
        email = data.get("email", "").strip()
        username = data.get("username", "").strip()

        if not email:
            return JSONResponse(
                status_code=400,
                content={"message": "Email required"}
            )

        code = str(random.randint(100000, 999999))
        expires = int(time.time()) + OTP_EXPIRY_SECONDS

        otp_storage[email] = {
            "code": code,
            "expires": expires
        }

        fancy = " ".join(list(code))
        name = username if username else "User"

        html = f"""
        <html>
        <body style="background:#f4f4f4; padding:20px; font-family:Arial;">
        <div style="max-width:500px;margin:auto;background:white;border-radius:12px;overflow:hidden;">
        <div style="background:#3f5668;color:white;text-align:center;padding:20px;">
        <h2>FurniFind</h2>
        <p>Email Verification</p>
        </div>

        <div style="padding:30px;text-align:center;">
        <h3>Hello {name}</h3>
        <p>Use this code to verify your account:</p>

        <div style="font-size:30px;font-weight:bold;letter-spacing:8px;
        background:#f1f1f1;padding:15px;border-radius:10px;">
        {fancy}
        </div>

        <p style="margin-top:15px;">Expires in {OTP_EXPIRY_SECONDS}s</p>
        </div>
        </div>
        </body>
        </html>
        """

        msg = MIMEText(html, "html")
        msg["Subject"] = "FurniFind Verification Code"
        msg["From"] = EMAIL_SENDER
        msg["To"] = email

        print("LOGIN:", EMAIL_SENDER)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_SENDER, EMAIL_APP_PASSWORD)
            server.sendmail(EMAIL_SENDER, email, msg.as_string())

        print("OTP:", code)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Code sent",
                "expires_in": OTP_EXPIRY_SECONDS
            }
        )

    except Exception as e:
        print("ERROR:")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": str(e)}
        )

# =========================
# VERIFY
# =========================
@app.post("/verify-code")
async def verify_code(data: dict = Body(...)):
    email = data.get("email")
    code = data.get("code")

    saved = otp_storage.get(email)

    if not saved:
        return {"status": "fail"}

    if int(time.time()) > saved["expires"]:
        return {"status": "expired"}

    if saved["code"] == code:
        otp_storage.pop(email)
        return {"status": "success"}

    return {"status": "fail"}

# =========================
# PREDICT
# =========================
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    img = await file.read()

    cls = classify_image(img)
    emb = extract_embedding(img)
    sims = get_similar(emb, cls)

    return JSONResponse({
        "predicted_class": cls,
        "similar_images": sims
    })