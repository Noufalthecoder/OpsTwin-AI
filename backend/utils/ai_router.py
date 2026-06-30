import os
import json
import logging
import time
from typing import Optional, Dict, Any, Tuple

from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types
from groq import Groq

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-70b-8192")

def _repair_json(raw: str) -> str:
    """Basic repair for truncated or markdown-fenced JSON."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if len(lines) > 1:
            lines = lines[1:]
        if lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text

def execute_prompt(
    prompt: str,
    system_instruction: Optional[str] = None,
    response_schema: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Executes a prompt against Gemini. If it fails, falls back to Groq.
    Returns: (parsed_json, execution_metrics)
    """
    metrics = {
        "provider": "gemini",
        "model": GEMINI_MODEL,
        "execution_time": 0.0,
        "tokens": 0,
        "error": None,
        "retries": 0,
        "cache": "miss",
    }
    
    t0 = time.time()
    
    # Try Gemini First
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        config_kwargs = {
            "temperature": 0.1,
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        if response_schema:
            config_kwargs["response_mime_type"] = "application/json"
            config_kwargs["response_schema"] = response_schema
            
        config = genai_types.GenerateContentConfig(**config_kwargs)
        
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=config,
        )
        
        t1 = time.time()
        metrics["execution_time"] = round(t1 - t0, 2)
        if response.usage_metadata:
            metrics["tokens"] = response.usage_metadata.total_token_count
            
        raw_text = response.text
        cleaned_text = _repair_json(raw_text)
        return json.loads(cleaned_text), metrics
        
    except Exception as gemini_err:
        logger.warning(f"Gemini failed: {gemini_err}. Falling back to Groq.")
        metrics["error"] = str(gemini_err)
        metrics["retries"] = 1
        
    # Fallback to Groq
    t_groq_0 = time.time()
    metrics["provider"] = "groq"
    metrics["model"] = GROQ_MODEL
    
    try:
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not set.")
            
        groq_client = Groq(api_key=GROQ_API_KEY)
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
            
        # Append schema requirements to prompt since Groq may not support exact structured outputs in the same way
        full_prompt = prompt
        if response_schema:
            full_prompt += f"\n\nYou MUST return valid JSON exactly matching this schema:\n{json.dumps(response_schema, indent=2)}"
            
        messages.append({"role": "user", "content": full_prompt})
        
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.1,
            response_format={"type": "json_object"} if response_schema else None
        )
        
        t1 = time.time()
        metrics["execution_time"] = round(t1 - t_groq_0, 2)
        if completion.usage:
            metrics["tokens"] = completion.usage.total_tokens
            
        raw_text = completion.choices[0].message.content
        cleaned_text = _repair_json(raw_text)
        return json.loads(cleaned_text), metrics
        
    except Exception as groq_err:
        logger.error(f"Groq fallback also failed: {groq_err}")
        metrics["error"] = f"Gemini: {metrics['error']}, Groq: {groq_err}"
        raise RuntimeError("Both primary and fallback AI providers failed.")
