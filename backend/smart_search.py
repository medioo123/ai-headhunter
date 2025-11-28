"""
Smart LinkedIn Search V3 - LLM-Optimized Query Selection

Instead of generating all possible combinations, the LLM intelligently selects
the top 10-15 best query combinations to maximize results.

Usage:
    from smart_search_v3 import SmartLinkedInSearchV3

    search = SmartLinkedInSearchV3(
        serpapi_key="your_key",
        openai_key="your_key"
    )

    profiles = search.search('''
        Conseillers clientèle pro, chargés d'affaires
        Yvelines, Île-de-France, 94600
        LCL, BNP, SG (actuel ou passé)
        5+ ans, PME/TPE
    ''')
"""

import json
import os
from dataclasses import dataclass
from urllib.parse import urlparse

import requests
from openai import OpenAI


@dataclass
class QueryCombination:
    """A single optimized query combination."""

    job_title: str
    company: str
    location: str
    priority: int  # 1 = highest priority
    xray_query: str  # The complete X-Ray query ready to use


@dataclass
class LinkedInProfile:
    """A LinkedIn profile found in search."""

    url: str
    name: str | None
    headline: str | None
    source_query: str
    rank: int


class SmartLinkedInSearchV3:
    """Smart LinkedIn search with LLM-optimized query selection."""

    def __init__(self, serpapi_key: str | None = None, openai_key: str | None = None):
        """Initialize search client."""
        self.serpapi_key = serpapi_key or os.environ.get("SERPAPI_KEY")
        self.openai_key = openai_key or os.environ.get("OPENAI_KEY")

        if not self.serpapi_key:
            raise ValueError("SERPAPI_KEY required")
        if not self.openai_key:
            raise ValueError("OPENAI_KEY required")

        self.openai_client = OpenAI(api_key=self.openai_key)

    def search(
        self,
        description: str,
        num_queries: int = 10,
        results_per_query: int = 50,
        max_results: int = 100,
        verbose: bool = True,
    ) -> list[LinkedInProfile]:
        """
        Search for LinkedIn profiles using natural language description.

        Args:
            description: Free-form text describing what you're looking for
            num_queries: Number of optimized queries to generate (default: 10)
            results_per_query: Results to fetch per query with pagination (default: 50)
            max_results: Maximum number of unique profiles to return (default: 100)
            verbose: Print progress

        Returns:
            List of LinkedInProfile objects

        Example:
            For 1000 profiles: num_queries=20, results_per_query=100, max_results=1000
        """
        if verbose:
            print("=" * 70)
            print("🧠 Smart LinkedIn Search V3 - LLM-Optimized Queries")
            print("=" * 70)
            print(f"\n📝 Your search:\n{description.strip()}\n")

        # Step 1: LLM generates optimized query combinations
        if verbose:
            print(f"🤖 Step 1: Generating {num_queries} optimized query combinations...")

        combinations = self._generate_optimal_queries(description, num_queries)

        if verbose:
            print(f"\n📋 Top {len(combinations)} Query Combinations:")
            for i, combo in enumerate(combinations, 1):
                print(f"   {i:2}. [{combo.priority}] \"{combo.job_title}\" + \"{combo.company}\" + \"{combo.location}\"")

        # Step 2: Execute all queries
        if verbose:
            print(f"\n🔍 Step 2: Executing {len(combinations)} searches ({results_per_query} results/query, max {max_results} profiles)...\n")

        profiles = self._execute_combinations(combinations, results_per_query, max_results, verbose)

        if verbose:
            print(f"\n✅ Found {len(profiles)} unique LinkedIn profiles")

        return profiles

    def _generate_optimal_queries(self, description: str, num_queries: int) -> list[QueryCombination]:
        """Use LLM to generate the best query combinations."""

        prompt = f"""Tu es un expert en recrutement LinkedIn, en Google X-Ray Search, et en stratégie de sourcing avancée.

Analyse soigneusement la description de recherche ci-dessous et génère EXACTEMENT {num_queries} combinaisons de recherche optimisées.

####################################################################
## DESCRIPTION DE RECHERCHE
####################################################################

{description}

####################################################################
## OBJECTIF
####################################################################

Générer les meilleures combinaisons de recherche pour trouver des profils LinkedIn pertinents via Google X-Ray.

Chaque combinaison doit contenir :
- **job_title** : un titre de poste pertinent (variantes FR/EN, synonymes)
- **company** : une entreprise où le profil a travaillé (actuel ou passé)
- **location** : une zone géographique cohérente (ville, région, département)
- **priority** : entre 1 et 5 (1 = plus stratégique)
- **xray_query** : une requête Google X-Ray prête à l’emploi

####################################################################
## RÈGLES DE GÉNÉRATION
####################################################################

### 1. PRIORITÉS
- **Priorité 1** : 
  - Titres très courants
  - Grandes entreprises
  - Localisations larges (ex : “Île-de-France”, “Yvelines”)
  - Requêtes simples et robustes
- **Priorité 2**
  - Variantes de titres courantes
  - Localisations intermédiaires (Versailles, Saint-Germain-en-Laye…)
- **Priorité 3–5** 
  - Titres moins fréquents, anglicismes, seniorité spécifique
  - Localisations plus précises (ville exacte ou code postal)
  - Quelques requêtes “créatives”

TOUTES les combinaisons doivent être plausibles et susceptibles de donner des résultats.

### 2. LOCALISATION
- Utiliser des zones **larges** dans les priorités 1 et 2.
- Les localisations très précises (ex : “94600”, “Poissy, Yvelines”) doivent être limitées aux priorités 3–5.

### 3. TITRES
Varier :
- Chargé d’affaires professionnels
- Conseiller clientèle professionnels
- Chargé d’affaires PME/TPE
- Relationship Manager / Account Manager
- Variantes senior : “senior”, “confirmé”, “expérimenté”

### 4. ENTREPRISES
Varier les grandes institutions mentionnées :
- BNP Paribas
- LCL
- Société Générale
- Crédit Agricole

Tu peux en utiliser moins, mais **pas toujours les mêmes dans chaque combinaison**.

### 5. GOOGLE X-RAY QUERY
Le champ **xray_query** doit respecter les règles suivantes :

- Toujours commencer par :  
  **site:linkedin.com/in**

- Utiliser les guillemets pour les termes exacts :
  - "Chargé d'affaires professionnels"
  - "BNP Paribas"

- Combiner les synonymes/titres équivalents avec **OR** :
  ("Chargé d'affaires professionnels" OR "Conseiller clientèle professionnels")

- Garder des requêtes courtes, robustes, fiables.

- Pas d'exclusions (`-term`).  
  La gestion des juniors/stagiaires se fait dans le scoring, pas dans la requête Google.

### 6. SIGNALS NÉGATIFS (SCORING, PAS FILTRAGE)

Analyse la description et propose aussi :
- **negative_signals** : liste de termes indiquant un profil junior  
  (ex : ["stagiaire", "alternance", "assistant", "junior"])

Ces termes NE doivent PAS être exclus des requêtes X-Ray.

####################################################################
## FORMAT DE LA RÉPONSE
####################################################################

Réponds UNIQUEMENT avec un JSON valide, sans markdown, sous cette forme :

{{
  "combinations": [
    {{
      "job_title": "...",
      "company": "...",
      "location": "...",
      "priority": 1,
      "xray_query": "site:linkedin.com/in ..."
    }},
    ...
  ],
  "negative_signals": ["stagiaire", "alternance", "assistant", "junior"]
}}

IMPORTANT :
- Génère EXACTEMENT {num_queries} combinaisons.
- Les combinaisons doivent être triées par priorité (1 → 5).
- Chaque combinaison doit respecter toutes les règles ci-dessus.
- Le JSON doit être propre et exploitable directement.
"""

        response = self.openai_client.chat.completions.create(
            model="gpt-5-mini-2025-08-07",
            max_completion_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.choices[0].message.content.strip()

        # Parse JSON
        try:
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]

            data = json.loads(response_text.strip())

            # Store negative signals (not used in queries, but kept for later filtering/scoring)
            self.negative_signals = data.get("negative_signals", [])

            # Convert to QueryCombination objects
            combinations = []
            for combo in data.get("combinations", []):
                combinations.append(
                    QueryCombination(
                        job_title=combo["job_title"],
                        company=combo["company"],
                        location=combo["location"],
                        priority=combo.get("priority", 5),
                        xray_query=combo.get("xray_query", ""),
                    )
                )

            # Sort by priority (1 = highest)
            combinations.sort(key=lambda x: x.priority)

            return combinations

        except (json.JSONDecodeError, KeyError) as e:
            raise ValueError(f"Failed to parse LLM response: {e}\n{response_text}")

    def _execute_combinations(
        self, combinations: list[QueryCombination], results_per_query: int, max_results: int, verbose: bool
    ) -> list[LinkedInProfile]:
        """Execute all query combinations."""
        profiles_by_url: dict[str, LinkedInProfile] = {}

        for i, combo in enumerate(combinations, 1):
            # Use the X-Ray query directly from LLM
            query = combo.xray_query

            if verbose:
                print(f"\n[{i}/{len(combinations)}] Priority {combo.priority}: {query[:90]}...")

            results = self._search_google(query, results_per_query=results_per_query)
            new_profiles_this_query = []
            duplicate_count = 0

            for result in results:
                url = self._normalize_url(result.get("link", ""))
                if not url:
                    continue

                if url not in profiles_by_url:
                    profile = LinkedInProfile(
                        url=url,
                        name=self._extract_name(result.get("title", "")),
                        headline=self._extract_headline(result.get("title", "")),
                        source_query=query,
                        rank=len(profiles_by_url) + 1,
                    )
                    profiles_by_url[url] = profile
                    new_profiles_this_query.append(profile)
                else:
                    duplicate_count += 1

            if verbose:
                print(
                    f"        → {len(results)} total results, {len(new_profiles_this_query)} new, {duplicate_count} duplicates"
                )

                # Print each new profile found
                if new_profiles_this_query:
                    for profile in new_profiles_this_query:
                        name_display = profile.name if profile.name else "???"
                        headline_display = (
                            profile.headline[:60] if profile.headline else "No headline"
                        )
                        if profile.headline and len(profile.headline) > 60:
                            headline_display += "..."
                        print(f"        ✓ #{profile.rank}: {name_display} - {headline_display}")

            if len(profiles_by_url) >= max_results:
                if verbose:
                    print(f"\n✅ Reached target of {max_results} profiles")
                break

        return list(profiles_by_url.values())

    def _search_google(self, query: str, results_per_query: int = 50) -> list[dict]:
        """
        Execute Google search via SerpAPI with pagination.

        Args:
            query: The search query
            results_per_query: Total results to fetch (will use pagination)

        Returns:
            List of search results
        """
        all_results = []

        # Google returns max 10 results per page, so we need pagination
        # For 50 results, we need 5 pages (start=0, 10, 20, 30, 40)
        pages_needed = (results_per_query + 9) // 10  # Round up

        for page in range(pages_needed):
            params = {
                "q": query,
                "api_key": self.serpapi_key,
                "engine": "google",
                "num": 10,  # Max per page
                "start": page * 10,  # Pagination offset
                "hl": "fr",
                "gl": "fr",
            }

            try:
                response = requests.get("https://serpapi.com/search", params=params, timeout=30)
                response.raise_for_status()
                results = response.json().get("organic_results", [])

                if not results:  # No more results
                    break

                all_results.extend(results)

                # Stop if we got enough results
                if len(all_results) >= results_per_query:
                    break

            except Exception as e:
                print(f"  ⚠️  Search error (page {page}): {e}")
                break

        return all_results[:results_per_query]  # Trim to exact limit

    def _normalize_url(self, url: str) -> str | None:
        """Normalize LinkedIn URL."""
        if "linkedin.com/in/" not in url.lower():
            return None
        url = url.split("?")[0].rstrip("/")
        if url.startswith("http://"):
            url = "https://" + url[7:]
        elif not url.startswith("https://"):
            url = "https://" + url
        if "/in/" not in urlparse(url).path:
            return None
        return url.lower()

    def _extract_name(self, title: str) -> str | None:
        """Extract name from title."""
        if " - " in title:
            return title.split(" - ")[0].strip()
        if " | " in title:
            return title.split(" | ")[0].strip()
        return None

    def _extract_headline(self, title: str) -> str | None:
        """Extract headline from title."""
        if " - " in title:
            parts = title.split(" - ", 1)
            if len(parts) > 1:
                return parts[1].replace(" | LinkedIn", "").replace(" - LinkedIn", "").strip()
        return None

    def save_results(self, profiles: list[LinkedInProfile], filename: str):
        """Save results to JSON."""
        data = [
            {
                "rank": p.rank,
                "url": p.url,
                "name": p.name,
                "headline": p.headline,
                "source_query": p.source_query,
            }
            for p in profiles
        ]
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)


def main():
    """Example usage."""

    search = SmartLinkedInSearchV3(
        serpapi_key=os.environ.get("SERPAPI_KEY"),
        openai_key=os.environ.get("OPENAI_KEY"),
    )

    # Example: Complex search - LLM will pick best 10 combinations
    profiles = search.search(
        description="""
        Je cherche des conseillers clientèle professionnels, chargés d'affaires pro,
        ou conseillers professionnels dans les Yvelines ou Île-de-France,
        notamment autour du code postal 94600 (Choisy-le-Roi).

        Ayant travaillé chez LCL, BNP Paribas, Société Générale, ou Crédit Agricole
        (poste actuel ou expérience passée).

        Avec expérience PME/TPE, au moins 5 ans d'expérience.
        Focus sur développement commercial et gestion de portefeuille.
        """,
        num_queries=10,  # LLM will generate top 10 combinations
        max_results=50,
        verbose=True,
    )

    print("\n" + "=" * 70)
    print(f"📊 RESULTS: {len(profiles)} profiles")
    print("=" * 70 + "\n")

    for profile in profiles[:15]:
        print(f"{profile.rank:3}. {profile.url}")
        if profile.name:
            print(f"     👤 {profile.name}")
        if profile.headline:
            print(f"     💼 {profile.headline}")
        print()

    search.save_results(profiles, "v3_results.json")
    print("💾 Results saved to v3_results.json")


if __name__ == "__main__":
    main()
