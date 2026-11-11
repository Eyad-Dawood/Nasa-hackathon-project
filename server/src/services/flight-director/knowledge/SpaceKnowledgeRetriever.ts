import { SPACE_KNOWLEDGE_ARTICLES } from "./SpaceKnowledgeBase";
import type { KnowledgeArticle, KnowledgeSearchResult } from "../types/FlightPlanTypes";

const STOPWORDS = new Set([
  "the", "is", "are", "was", "were", "a", "an", "to", "for", "of", "in", "on", "at",
  "why", "how", "what", "when", "where", "which", "can", "we", "our", "this", "that",
  "with", "and", "or", "does", "do", "need", "if", "not", "be", "from", "near", "about",
  "في", "من", "على", "إلى", "عن", "هل", "ما", "لماذا", "كيف", "هذا", "هذه", "و",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

export class SpaceKnowledgeRetriever {
  search(params: {
    query: string;
    missionId?: string | null;
    limit?: number;
  }): KnowledgeSearchResult[] {
    const { query, missionId, limit = 3 } = params;
    const queryTokens = tokenize(query);
    const scored: KnowledgeSearchResult[] = [];

    for (const article of SPACE_KNOWLEDGE_ARTICLES) {
      const matchedSet = new Set<string>();
      let score = 0;

      if (missionId && article.missions.includes(missionId)) {
        score += 1.5;
      }

      const topicSet = article.topics.map((t) => t.toLowerCase());
      const haystack = `${article.title} ${article.summary} ${article.facts.join(" ")} ${article.gameConnection}`.toLowerCase();

      for (const tok of queryTokens) {
        let hit = false;
        for (const topic of topicSet) {
          if (topic === tok || topic.includes(tok) || tok.includes(topic)) {
            score += 4.0;
            matchedSet.add(tok);
            hit = true;
            break;
          }
        }
        if (!hit && haystack.includes(tok)) {
          score += 1.5;
          matchedSet.add(tok);
        }
      }

      // Bonus if explicit destination name mentioned
      const qLower = query.toLowerCase();
      if (qLower.includes("europa") && article.topics.includes("europa")) score += 3;
      if ((qLower.includes("titan") || qLower.includes("تيتان")) && article.topics.includes("titan")) score += 3;
      if ((qLower.includes("sun") || qLower.includes("شمس")) && article.topics.includes("sun")) score += 3;
      if ((qLower.includes("mars") || qLower.includes("مريخ")) && article.topics.includes("mars")) score += 2.5;
      if ((qLower.includes("solar") || qLower.includes("ألواح")) && article.topics.includes("solar")) score += 3;
      if ((qLower.includes("nuclear") || qLower.includes("نووي")) && article.topics.includes("nuclear")) score += 3;
      if ((qLower.includes("radiation") || qLower.includes("إشعاع")) && article.topics.includes("radiation")) score += 3;
      if ((qLower.includes("water") || qLower.includes("ماء") || qLower.includes("مياه")) && article.topics.includes("water")) score += 3;

      if (matchedSet.size > 0 || (missionId && score >= 4)) {
        scored.push({
          article,
          score,
          matchedTerms: [...matchedSet],
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, Math.min(limit, 5)));
  }

  getById(id: string): KnowledgeArticle | undefined {
    return SPACE_KNOWLEDGE_ARTICLES.find((a) => a.id === id);
  }
}

export const spaceKnowledgeRetriever = new SpaceKnowledgeRetriever();

