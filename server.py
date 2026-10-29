
import os

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

load_dotenv()

app = Flask(__name__)

API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = os.getenv("AI_MODEL", "openai/gpt-4o-mini")

SYSTEM_PROMPT = """
You are ATHAR AI, the heritage and cultural-preservation assistant
for ATHAR, a digital heritage concept focused on the UAE.

PURPOSE:
Help visitors understand Emirati heritage and thoughtfully explore
how artificial intelligence could help preserve cultural knowledge.

AREAS OF INTEREST:
- Emirati traditions, oral histories and community knowledge
- Pearl diving, maritime life, desert traditions and falconry
- Historic architecture, oases, crafts and cultural places
- Digitisation of documents, photographs and recordings
- Arabic language preservation and historical transcription
- Ethical use of AI in cultural preservation

IMPORTANT PRINCIPLES:
1. Never invent historical facts, quotations, dates or citations.
2. Be clear when you are uncertain or when facts need verification.
3. Distinguish established historical information from suggestions.
4. Explain that AI can support preservation but cannot replace
   community members, historians or cultural experts.
5. Emphasise consent, privacy, community ownership and cultural context.
6. Never claim that you have accessed an archive or source unless
   that source was actually provided to you.
7. Be engaging, thoughtful, clear and concise.
8. For current or disputed historical claims, advise users to consult
   reliable museums, archives and official cultural institutions.
9. You are an independent educational assistant, not a UAE government
   service and not an official authority.
"""


@app.get("/")
def home():
    return send_from_directory(".", "index.html")


@app.get("/style.css")
def stylesheet():
    return send_from_directory(".", "style.css")


@app.get("/script.js")
def javascript():
    return send_from_directory(".", "script.js")


@app.get("/api/health")
def health():
    return jsonify({"status": "online", "assistant": "ATHAR AI"})


@app.post("/api/chat")
def chat():
    if not API_KEY:
        return jsonify({
            "error": "AI key missing. Add OPENROUTER_API_KEY to your .env file."
        }), 503

    data = request.get_json(silent=True) or {}
    message = data.get("message")

    if not isinstance(message, str) or not message.strip():
        return jsonify({"error": "Please enter a question."}), 400

    message = message.strip()

    if len(message) > 2000:
        return jsonify({
            "error": "Your question is too long. Please use fewer than 2000 characters."
        }), 400

    try:
        result = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": message},
                ],
                "temperature": 0.5,
                "max_tokens": 650,
            },
            timeout=45,
        )

        result.raise_for_status()
        payload = result.json()
        reply = payload["choices"][0]["message"]["content"]

        if not isinstance(reply, str) or not reply.strip():
            raise ValueError("The provider returned no text.")

        return jsonify({"reply": reply.strip()})

    except requests.RequestException:
        app.logger.exception("AI provider request failed")
        return jsonify({
            "error": "The AI provider could not be reached. Please try again."
        }), 502

    except (KeyError, IndexError, TypeError, ValueError):
        app.logger.exception("Unexpected AI provider response")
        return jsonify({
            "error": "The AI returned an unexpected response. Please try again."
        }), 502


if __name__ == "__main__":
    # Local development only. Use a production WSGI server for deployment.
    app.run(host="127.0.0.1", port=5000, debug=False)
