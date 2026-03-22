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

import io
import os
import json
import random
import smtplib
import time
import traceback
from email.mime.text import MIMEText

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