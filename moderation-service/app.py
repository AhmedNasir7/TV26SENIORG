from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI()
classifier = pipeline(
    "text-classification",
    model="unitary/toxic-bert",
    top_k=None,
)

FLAG_THRESHOLD = 0.5

# unitary/toxic-bert's blanket "toxic" and "obscene" labels fire on any
# profanity regardless of intent -- "this fucking rocks!" scores ~0.98 on
# "toxic" the same as a genuine insult. The categories that actually track
# directed harm (insulting, threatening, or hateful intent, or extreme
# severity) are the ones worth gating on; this lets casual swearing through
# while still catching real abuse.
HARM_LABELS = {"insult", "threat", "severe_toxic", "identity_hate"}


class ModerateRequest(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/moderate")
def moderate(req: ModerateRequest):
    text = req.text.strip()[:512]
    if not text:
        return {"flagged": False, "label": None, "score": 0.0}

    scores = classifier(text)[0]
    harm_scores = [s for s in scores if s["label"] in HARM_LABELS]
    top = max(harm_scores, key=lambda s: s["score"])
    flagged = top["score"] >= FLAG_THRESHOLD

    return {"flagged": flagged, "label": top["label"], "score": top["score"]}
