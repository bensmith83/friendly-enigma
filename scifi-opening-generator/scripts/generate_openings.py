#!/usr/bin/env python3
"""
Generate compelling sci-fi opening and ending pages using award-winning novels
as inspiration. Uses Hugging Face Inference API (free tier), OpenAI, or Claude.
"""

import json
import os
import random
import sys
from datetime import datetime
from pathlib import Path

import requests

# Nebula and Hugo Award-winning novels and novellas (selection of notable works)
AWARD_WINNING_WORKS = [
    # Hugo & Nebula Double Winners - Novels
    {"title": "Dune", "author": "Frank Herbert", "year": 1966},
    {"title": "The Left Hand of Darkness", "author": "Ursula K. Le Guin", "year": 1970},
    {"title": "Ringworld", "author": "Larry Niven", "year": 1971},
    {"title": "The Gods Themselves", "author": "Isaac Asimov", "year": 1973},
    {"title": "Rendezvous with Rama", "author": "Arthur C. Clarke", "year": 1974},
    {"title": "The Dispossessed", "author": "Ursula K. Le Guin", "year": 1975},
    {"title": "The Forever War", "author": "Joe Haldeman", "year": 1976},
    {"title": "Gateway", "author": "Frederik Pohl", "year": 1978},
    {"title": "Dreamsnake", "author": "Vonda N. McIntyre", "year": 1979},
    {"title": "The Fountains of Paradise", "author": "Arthur C. Clarke", "year": 1980},
    {"title": "Startide Rising", "author": "David Brin", "year": 1984},
    {"title": "Neuromancer", "author": "William Gibson", "year": 1985},
    {"title": "Ender's Game", "author": "Orson Scott Card", "year": 1986},
    {"title": "Speaker for the Dead", "author": "Orson Scott Card", "year": 1987},
    {"title": "Falling Free", "author": "Lois McMaster Bujold", "year": 1989},
    {"title": "Hyperion", "author": "Dan Simmons", "year": 1990},
    {"title": "Doomsday Book", "author": "Connie Willis", "year": 1993},
    {"title": "Forever Peace", "author": "Joe Haldeman", "year": 1998},
    {"title": "American Gods", "author": "Neil Gaiman", "year": 2002},
    {"title": "Paladin of Souls", "author": "Lois McMaster Bujold", "year": 2004},
    {"title": "The Yiddish Policemen's Union", "author": "Michael Chabon", "year": 2008},
    {"title": "The Windup Girl", "author": "Paolo Bacigalupi", "year": 2010},
    {"title": "Blackout/All Clear", "author": "Connie Willis", "year": 2011},
    {"title": "Among Others", "author": "Jo Walton", "year": 2012},
    {"title": "Ancillary Justice", "author": "Ann Leckie", "year": 2014},
    {"title": "The Fifth Season", "author": "N.K. Jemisin", "year": 2016},
    {"title": "The Obelisk Gate", "author": "N.K. Jemisin", "year": 2017},
    {"title": "The Stone Sky", "author": "N.K. Jemisin", "year": 2018},
    {"title": "A Memory Called Empire", "author": "Arkady Martine", "year": 2020},
    {"title": "Network Effect", "author": "Martha Wells", "year": 2021},
    {"title": "A Desolation Called Peace", "author": "Arkady Martine", "year": 2022},

    # Notable Hugo Winners
    {"title": "The Moon is a Harsh Mistress", "author": "Robert A. Heinlein", "year": 1967},
    {"title": "Stand on Zanzibar", "author": "John Brunner", "year": 1969},
    {"title": "A Fire Upon the Deep", "author": "Vernor Vinge", "year": 1993},
    {"title": "Harry Potter and the Goblet of Fire", "author": "J.K. Rowling", "year": 2001},
    {"title": "Jonathan Strange & Mr Norrell", "author": "Susanna Clarke", "year": 2005},
    {"title": "Rainbows End", "author": "Vernor Vinge", "year": 2007},
    {"title": "Redshirts", "author": "John Scalzi", "year": 2013},
    {"title": "The Three-Body Problem", "author": "Liu Cixin", "year": 2015},

    # Notable Nebula Winners
    {"title": "Babel-17", "author": "Samuel R. Delany", "year": 1967},
    {"title": "The Einstein Intersection", "author": "Samuel R. Delany", "year": 1968},
    {"title": "Rite of Passage", "author": "Alexei Panshin", "year": 1969},
    {"title": "A Time of Changes", "author": "Robert Silverberg", "year": 1972},
    {"title": "The Man Who Folded Himself", "author": "David Gerrold", "year": 1974},
    {"title": "Man Plus", "author": "Frederik Pohl", "year": 1977},
    {"title": "Timescape", "author": "Gregory Benford", "year": 1981},
    {"title": "No Enemy But Time", "author": "Michael Bishop", "year": 1983},
    {"title": "Tehanu", "author": "Ursula K. Le Guin", "year": 1991},
    {"title": "Red Mars", "author": "Kim Stanley Robinson", "year": 1993},
    {"title": "Moving Mars", "author": "Greg Bear", "year": 1994},
    {"title": "The Terminal Experiment", "author": "Robert J. Sawyer", "year": 1996},
    {"title": "The Moon and the Sun", "author": "Vonda N. McIntyre", "year": 1998},
    {"title": "Parable of the Talents", "author": "Octavia E. Butler", "year": 1999},
    {"title": "Darwin's Radio", "author": "Greg Bear", "year": 2000},
    {"title": "The Quantum Rose", "author": "Catherine Asaro", "year": 2002},
    {"title": "The Speed of Dark", "author": "Elizabeth Moon", "year": 2004},
    {"title": "Seeker", "author": "Jack McDevitt", "year": 2007},
    {"title": "The Drowning Girl", "author": "Caitlin R. Kiernan", "year": 2013},
    {"title": "Annihilation", "author": "Jeff VanderMeer", "year": 2015},
    {"title": "All the Birds in the Sky", "author": "Charlie Jane Anders", "year": 2017},
    {"title": "The Calculating Stars", "author": "Mary Robinette Kowal", "year": 2019},
    {"title": "A Master of Djinn", "author": "P. Djeli Clark", "year": 2022},
    {"title": "The Spare Man", "author": "Mary Robinette Kowal", "year": 2023},

    # Notable Novellas (Hugo & Nebula)
    {"title": "The Word for World is Forest", "author": "Ursula K. Le Guin", "year": 1973, "type": "novella"},
    {"title": "A Boy and His Dog", "author": "Harlan Ellison", "year": 1970, "type": "novella"},
    {"title": "Beggars in Spain", "author": "Nancy Kress", "year": 1992, "type": "novella"},
    {"title": "The Empress of Salt and Fortune", "author": "Nghi Vo", "year": 2021, "type": "novella"},
    {"title": "Binti", "author": "Nnedi Okofor", "year": 2016, "type": "novella"},
    {"title": "All Systems Red", "author": "Martha Wells", "year": 2018, "type": "novella"},
    {"title": "Artificial Condition", "author": "Martha Wells", "year": 2019, "type": "novella"},
    {"title": "This Is How You Lose the Time War", "author": "Amal El-Mohtar & Max Gladstone", "year": 2020, "type": "novella"},
    {"title": "Ring Shout", "author": "P. Djeli Clark", "year": 2021, "type": "novella"},
    {"title": "Elder Race", "author": "Adrian Tchaikovsky", "year": 2023, "type": "novella"},
]

# Writing style elements from award-winning sci-fi
STYLE_ELEMENTS = [
    "hard science fiction with detailed technical accuracy",
    "space opera with sweeping galactic scope",
    "cyberpunk with gritty urban dystopia",
    "literary science fiction with deep character study",
    "military science fiction with tactical precision",
    "biopunk exploring genetic modification",
    "post-apocalyptic with survival themes",
    "first contact with alien civilizations",
    "time travel with paradox exploration",
    "generation ship with society evolution",
    "virtual reality and consciousness transfer",
    "climate fiction with environmental themes",
    "afrofuturism with cultural richness",
    "solarpunk with optimistic futures",
]

THEMES = [
    "the nature of consciousness and identity",
    "humanity's relationship with artificial intelligence",
    "the consequences of unchecked technological progress",
    "colonialism and its echoes across the stars",
    "memory, loss, and what makes us human",
    "revolution against oppressive systems",
    "first contact and the challenge of communication",
    "the price of immortality",
    "ecological collapse and renewal",
    "the boundaries between human and machine",
    "time as a prison and a gift",
    "found family in the vastness of space",
    "the weight of empire and resistance",
    "isolation and connection across light-years",
]


def get_huggingface_response(prompt: str, api_token: str) -> str:
    """Call Hugging Face Inference API with a free-tier model."""
    # Using Mistral or another capable free model
    api_url = "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1"

    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }

    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 500,
            "temperature": 0.8,
            "top_p": 0.95,
            "do_sample": True,
            "return_full_text": False,
        },
    }

    response = requests.post(api_url, headers=headers, json=payload, timeout=60)
    response.raise_for_status()

    result = response.json()
    if isinstance(result, list) and len(result) > 0:
        return result[0].get("generated_text", "").strip()
    return ""


def get_openai_response(prompt: str, api_key: str) -> str:
    """Call OpenAI API as alternative."""
    api_url = "https://api.openai.com/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 500,
        "temperature": 0.8,
    }

    response = requests.post(api_url, headers=headers, json=payload, timeout=60)
    response.raise_for_status()

    result = response.json()
    return result["choices"][0]["message"]["content"].strip()


def get_claude_response(prompt: str, api_key: str) -> str:
    """Call Anthropic Claude API."""
    api_url = "https://api.anthropic.com/v1/messages"

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "claude-3-haiku-20240307",  # Using Haiku for cost efficiency
        "max_tokens": 600,
        "messages": [{"role": "user", "content": prompt}],
    }

    response = requests.post(api_url, headers=headers, json=payload, timeout=60)
    response.raise_for_status()

    result = response.json()
    # Claude returns content as a list of content blocks
    if result.get("content") and len(result["content"]) > 0:
        return result["content"][0].get("text", "").strip()
    return ""


def generate_opening_prompt(work: dict, is_opening: bool = True) -> str:
    """Create a prompt for generating an opening or ending."""
    style = random.choice(STYLE_ELEMENTS)
    theme = random.choice(THEMES)
    page_type = "opening" if is_opening else "ending"

    prompt = f"""You are a masterful science fiction author inspired by the works of {work['author']},
particularly their award-winning novel "{work['title']}".

Write a compelling {page_type} page for an original science fiction story in the style of {style},
exploring the theme of {theme}.

Requirements:
- Write exactly one page (about 250-300 words)
- Create an original story, not a retelling of "{work['title']}"
- {"Hook the reader immediately with intrigue, action, or mystery" if is_opening else "Provide a satisfying, thought-provoking conclusion that resonates"}
- Use vivid, sensory prose
- {"Introduce an intriguing character or situation" if is_opening else "Leave the reader with a lasting emotional impact"}

Write only the {page_type} page, no titles or explanations:"""

    return prompt


def load_existing_cache(cache_path: Path) -> dict:
    """Load existing cache file or return empty structure."""
    if cache_path.exists():
        with open(cache_path, "r") as f:
            return json.load(f)
    return {"openings": [], "endings": [], "last_updated": None}


def save_cache(cache: dict, cache_path: Path):
    """Save cache to JSON file."""
    cache["last_updated"] = datetime.utcnow().isoformat()
    with open(cache_path, "w") as f:
        json.dump(cache, f, indent=2)


def generate_content(
    api_token: str,
    api_type: str = "huggingface",
    num_to_generate: int = 5,
    max_cache_size: int = 50,
) -> None:
    """Generate new openings and endings, respecting cache limits."""
    script_dir = Path(__file__).parent
    cache_path = script_dir.parent / "data" / "openings.json"

    cache = load_existing_cache(cache_path)

    # Determine how many to generate
    current_openings = len(cache.get("openings", []))
    current_endings = len(cache.get("endings", []))

    openings_needed = min(num_to_generate, max_cache_size - current_openings)
    endings_needed = min(num_to_generate, max_cache_size - current_endings)

    print(f"Cache status: {current_openings} openings, {current_endings} endings")
    print(f"Will generate: {openings_needed} openings, {endings_needed} endings")

    # Select API function
    if api_type == "openai":
        api_func = lambda p: get_openai_response(p, api_token)
    elif api_type == "claude":
        api_func = lambda p: get_claude_response(p, api_token)
    else:
        api_func = lambda p: get_huggingface_response(p, api_token)

    # Generate openings
    for i in range(openings_needed):
        work = random.choice(AWARD_WINNING_WORKS)
        prompt = generate_opening_prompt(work, is_opening=True)

        try:
            text = api_func(prompt)
            if text:
                entry = {
                    "text": text,
                    "inspired_by": work["title"],
                    "author": work["author"],
                    "type": "opening",
                    "generated_at": datetime.utcnow().isoformat(),
                }
                cache.setdefault("openings", []).append(entry)
                print(f"Generated opening {i+1}/{openings_needed} (inspired by {work['title']})")
        except Exception as e:
            print(f"Error generating opening: {e}")
            continue

    # Generate endings
    for i in range(endings_needed):
        work = random.choice(AWARD_WINNING_WORKS)
        prompt = generate_opening_prompt(work, is_opening=False)

        try:
            text = api_func(prompt)
            if text:
                entry = {
                    "text": text,
                    "inspired_by": work["title"],
                    "author": work["author"],
                    "type": "ending",
                    "generated_at": datetime.utcnow().isoformat(),
                }
                cache.setdefault("endings", []).append(entry)
                print(f"Generated ending {i+1}/{endings_needed} (inspired by {work['title']})")
        except Exception as e:
            print(f"Error generating ending: {e}")
            continue

    # Trim cache if over limit (remove oldest entries)
    if len(cache.get("openings", [])) > max_cache_size:
        cache["openings"] = cache["openings"][-max_cache_size:]
    if len(cache.get("endings", [])) > max_cache_size:
        cache["endings"] = cache["endings"][-max_cache_size:]

    save_cache(cache, cache_path)
    print(f"Cache saved: {len(cache['openings'])} openings, {len(cache['endings'])} endings")


def main():
    # Check for API tokens (in order of preference)
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")

    if anthropic_key:
        print("Using Claude API (Anthropic)")
        generate_content(anthropic_key, api_type="claude", num_to_generate=5)
    elif openai_key:
        print("Using OpenAI API")
        generate_content(openai_key, api_type="openai", num_to_generate=5)
    elif hf_token:
        print("Using Hugging Face API")
        generate_content(hf_token, api_type="huggingface", num_to_generate=5)
    else:
        print("Error: No API token found!")
        print("Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, or HF_TOKEN")
        sys.exit(1)


if __name__ == "__main__":
    main()
