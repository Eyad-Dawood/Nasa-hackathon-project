import { z } from "zod";
import { spaceKnowledgeRetriever } from "../knowledge/SpaceKnowledgeRetriever";
import type { RegisteredTool } from "./MissionTools";

export const searchSpaceKnowledgeTool: RegisteredTool = {
  schemaDef: {
    name: "search_space_knowledge",
    description:
      "Search curated NASA/JPL educational space science knowledge (solar inverse-square law, nuclear RTGs, Europa radiation, Titan methane atmosphere, Parker Solar Probe thermal physics, ion vs chemical propulsion, Deep Space Network) and retrieve verified official NASA URLs.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search question or science topic (English or Arabic).",
        },
        limit: {
          type: "number",
          description: "Maximum articles to return (1..5, default 2).",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  zodSchema: z
    .object({
      query: z.string().trim().min(2).max(200),
      limit: z.number().int().min(1).max(5).optional(),
    })
    .strict(),
  execute: async (args, ctx) => {
    const query = String(args.query);
    const limit = typeof args.limit === "number" ? args.limit : 2;
    const results = spaceKnowledgeRetriever.search({
      query,
      missionId: ctx.gameContext.mission?.id ?? null,
      limit,
    });

    return {
      ok: true,
      query,
      count: results.length,
      articles: results.map((r) => ({
        id: r.article.id,
        title: r.article.title,
        organization: r.article.organization,
        url: r.article.url,
        summary: r.article.summary,
        facts: r.article.facts,
        ageFriendlyAnalogy: r.article.ageFriendlyAnalogy,
        gameConnection: r.article.gameConnection,
        matchedTerms: r.matchedTerms,
      })),
    };
  },
};

