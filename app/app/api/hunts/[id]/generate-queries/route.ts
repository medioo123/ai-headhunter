import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

interface QueryCombination {
  job_title: string
  company: string
  location: string
  priority: number
  xray_query: string
}

interface LLMResponse {
  combinations: QueryCombination[]
  negative_signals?: string[]
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get hunt
    const { data: hunt, error: huntError } = await supabase
      .from('hunts')
      .select('*')
      .eq('id', id)
      .single()

    if (huntError || !hunt) {
      return NextResponse.json({ error: 'Hunt not found' }, { status: 404 })
    }

    // Verify ownership
    if (hunt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch existing queries to avoid duplicates
    const { data: existingQueries } = await supabase
      .from('queries')
      .select('job_title, company, location, xray_query')
      .eq('hunt_id', id)

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const numQueries = hunt.num_queries || 10

    // Build existing queries section for prompt
    let existingQueriesSection = ''
    if (existingQueries && existingQueries.length > 0) {
      existingQueriesSection = `
####################################################################
## REQUÊTES EXISTANTES À ÉVITER
####################################################################

Les combinaisons suivantes ont DÉJÀ été générées. Tu DOIS générer des requêtes DIFFÉRENTES :

${existingQueries.map((q, i) => `${i + 1}. Job: "${q.job_title}" | Company: "${q.company}" | Location: "${q.location}"
   Query: ${q.xray_query}`).join('\n\n')}

IMPORTANT : Génère ${numQueries} NOUVELLES combinaisons qui utilisent :
- D'autres titres de poste (synonymes, variantes, niveaux différents)
- D'autres entreprises (concurrents, autres secteurs)
- D'autres localisations (villes voisines, départements adjacents)
- D'autres formulations de requêtes X-Ray

`
    }

    // LLM prompt (from smart_search.py)
    const prompt = `Tu es un expert en recrutement LinkedIn, en Google X-Ray Search, et en stratégie de sourcing avancée.

Analyse soigneusement la description de recherche ci-dessous et génère EXACTEMENT ${numQueries} combinaisons de recherche optimisées.

####################################################################
## DESCRIPTION DE RECHERCHE
####################################################################

${hunt.description}
${existingQueriesSection}

####################################################################
## OBJECTIF
####################################################################

Générer ${numQueries} requêtes ULTRA-COMPLÈTES pour maximiser la couverture avec le minimum de requêtes.

**STRATÉGIE CLÉS** : Utiliser massivement les opérateurs OR pour combiner :
- Tous les synonymes et variantes de titres de poste
- Multiples entreprises pertinentes
- Plusieurs zones géographiques
- Variantes FR/EN et abréviations

Chaque combinaison doit contenir :
- **job_title** : titre principal (le plus représentatif)
- **company** : entreprise principale (ou "Multiple" si plusieurs)
- **location** : zone principale (ou "Multiple" si plusieurs)
- **priority** : entre 1 et 5 (1 = plus stratégique)
- **xray_query** : une requête Google X-Ray TRÈS LARGE avec BEAUCOUP de OR

####################################################################
## RÈGLES DE GÉNÉRATION
####################################################################

### 1. PRIORITÉS
- **Priorité 1** :
  - Requêtes ULTRA-LARGES combinant TOUS les titres principaux avec OR
  - Toutes les grandes entreprises du secteur avec OR
  - Toutes les zones géographiques pertinentes avec OR
  - Objectif : Capturer la majorité des profils en 1-2 requêtes

- **Priorité 2-3** :
  - Requêtes moyennes ciblant des sous-groupes spécifiques
  - Combinaisons de variantes moins courantes
  - Focus sur des niches importantes

- **Priorité 4-5** :
  - Requêtes de complément pour couvrir les cas edge
  - Variantes rares mais pertinentes
  - Anglicismes et titres internationaux

### 2. GOOGLE X-RAY QUERY - RÈGLES STRICTES

**IMPÉRATIF** : Utiliser MASSIVEMENT les opérateurs OR pour maximiser les résultats !

- Toujours commencer par : **site:linkedin.com/in**

- **COMBINER AU MAXIMUM** avec OR :
  ("Chargé d'affaires" OR "Conseiller clientèle" OR "Business developer" OR "Account manager")

- **ENTREPRISES** : Grouper plusieurs entreprises :
  ("BNP Paribas" OR "Société Générale" OR "Crédit Agricole" OR "LCL")

- **LOCALISATIONS** : Combiner villes, départements, régions :
  ("Île-de-France" OR "Paris" OR "Yvelines" OR "78" OR "Hauts-de-Seine" OR "92")

- **VARIANTES** : Inclure FR/EN, abréviations, pluriel/singulier :
  ("PME" OR "TPE" OR "petite entreprise" OR "small business")

- **Guillemets** pour termes exacts, **OR** pour alternatives

- **PAS d'exclusions** (-term) - On veut le maximum de résultats

**EXEMPLE DE REQUÊTE OPTIMALE** :
site:linkedin.com/in ("Chargé d'affaires" OR "Conseiller clientèle professionnels" OR "Gestionnaire de portefeuille PME" OR "Business Developer") ("BNP Paribas" OR "Société Générale" OR "Crédit Agricole" OR "LCL" OR "Caisse d'Épargne") ("Île-de-France" OR "Paris" OR "Yvelines" OR "78" OR "Hauts-de-Seine" OR "92")

####################################################################
## FORMAT DE LA RÉPONSE
####################################################################

Réponds UNIQUEMENT avec un JSON valide, sans markdown, sous cette forme :

{
  "combinations": [
    {
      "job_title": "...",
      "company": "...",
      "location": "...",
      "priority": 1,
      "xray_query": "site:linkedin.com/in ..."
    }
  ],
  "negative_signals": ["stagiaire", "alternance", "assistant", "junior"]
}

IMPORTANT :
- Génère EXACTEMENT ${numQueries} combinaisons.
- Les combinaisons doivent être triées par priorité (1 → 5).
- **MAXIMISE l'utilisation des OR** - Chaque requête doit combiner le plus de variantes possibles
- Les requêtes priorité 1-2 doivent être TRÈS LARGES (5-10 OR par critère minimum)
- Objectif : Couvrir 80% des profils avec les 2-3 premières requêtes
- Le JSON doit être propre et exploitable directement.`

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 5000, // Increased for longer queries with many OR operators
      messages: [{ role: 'user', content: prompt }],
    })

    let responseText = response.choices[0].message.content?.trim() || ''

    // Parse JSON response
    if (responseText.includes('```json')) {
      responseText = responseText.split('```json')[1].split('```')[0]
    } else if (responseText.includes('```')) {
      responseText = responseText.split('```')[1].split('```')[0]
    }

    const data: LLMResponse = JSON.parse(responseText.trim())

    // Insert queries into database
    const queries = data.combinations.map((combo) => ({
      hunt_id: id,
      xray_query: combo.xray_query,
      job_title: combo.job_title,
      company: combo.company,
      location: combo.location,
      priority: combo.priority,
      status: 'pending' as const,
    }))

    const { error: insertError } = await supabase
      .from('queries')
      .insert(queries)

    if (insertError) {
      throw new Error(`Failed to insert queries: ${insertError.message}`)
    }

    // Update hunt status to active
    await supabase
      .from('hunts')
      .update({ status: 'active' })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      queries: data.combinations.length,
      negative_signals: data.negative_signals
    })
  } catch (error: any) {
    console.error('Generate queries error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
