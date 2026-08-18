# backend/api/ai/providers.py
# pyrefly: ignore [missing-import]
import openai
# pyrefly: ignore [missing-import]
from openai import OpenAI
from abc import ABC, abstractmethod
from django.conf import settings
import requests
import logging

logger = logging.getLogger(__name__)

class AIProvider(ABC):
    @abstractmethod
    def generate(self, prompt, system_message=None, max_tokens=1500, temperature=0.7):
        pass

    @abstractmethod
    def is_available(self):
        pass

    @property
    @abstractmethod
    def name(self):
        pass


class GroqProvider(AIProvider):
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://api.groq.com/openai/v1",
        )
        self.model = "llama-3.3-70b-versatile"

    @property
    def name(self):
        return "Groq"

    def is_available(self):
        return bool(self.api_key and self.api_key != "your-groq-api-key-here")

    def generate(self, prompt, system_message=None, max_tokens=1500, temperature=0.7):
        try:
            messages = []
            if system_message:
                messages.append({"role": "system", "content": system_message})
            messages.append({"role": "user", "content": prompt})
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq error: {str(e)}")
            if "429" in str(e) or "rate_limit" in str(e).lower() or "too many requests" in str(e).lower():
                raise Exception("The AI request limit has expired. It will refresh at midnight.")
            raise


class GeminiProvider(AIProvider):
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = "gemini-1.5-flash"
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

    @property
    def name(self):
        return "Google Gemini"

    def is_available(self):
        return bool(self.api_key and self.api_key != "your-gemini-api-key-here")

    def generate(self, prompt, system_message=None, max_tokens=1500, temperature=0.7):
        try:
            context = system_message or "You are a professional M&E assistant."
            full_prompt = f"{context}\n\n{prompt}"
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                }
            }
            response = requests.post(self.api_url, json=payload)
            if response.status_code == 429:
                raise Exception("The AI request limit has expired. It will refresh at midnight.")
            response.raise_for_status()
            return response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            logger.error(f"Gemini error: {str(e)}")
            if "expired. It will refresh at midnight." in str(e):
                raise
            if "429" in str(e) or "Too Many Requests" in str(e):
                raise Exception("The AI request limit has expired. It will refresh at midnight.")
            raise