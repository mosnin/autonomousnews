export type ArticleStatus = "draft" | "scheduled" | "published" | "archived";

export type Article = {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  body: string;
  excerpt: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  category_slug: string;
  subcategory_slug: string | null;
  tags: string[];
  author_name: string;
  author_slug: string;
  source_urls: string[];
  status: ArticleStatus;
  read_minutes: number;
  is_featured: boolean;
  is_breaking: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[];
  published_at: string | null;
  updated_at: string;
  created_at: string;
  // Phase 2 additions
  topic_key: string | null;
  update_count: number;
  last_updated_by_run: string | null;
  image_credit: string | null;
  image_source_url: string | null;
  image_is_ai_generated: boolean;
  image_provider: string | null;
  ai_disclosed: boolean;
  model_used: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  generation_cost_usd: number | null;
};

export type AgentRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type AgentRun = {
  id: string;
  trigger: string;
  agent: string;
  status: AgentRunStatus;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  topics_considered: number;
  articles_created: number;
  cost_usd: number | null;
  model: string | null;
  metadata: Record<string, unknown>;
  error: string | null;
  created_at: string;
};

export type AgentLogLevel = "debug" | "info" | "warn" | "error";

export type AgentLog = {
  id: number;
  run_id: string | null;
  level: AgentLogLevel;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AgentRunArticle = {
  run_id: string;
  article_id: string;
  created_at: string;
};

export type AuthorRow = {
  slug: string;
  name: string;
  title: string;
  bio: string;
  beat: string[];
  sub_beat: string[];
  avatar_url: string | null;
  created_at: string;
};

export type CostLedgerRow = {
  day: string;
  openai_cost_usd: number;
  image_cost_usd: number;
  total_cost_usd: number;
  articles_created: number;
  runs_completed: number;
  updated_at: string;
};

type TableHelper<Row extends Record<string, unknown>, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      articles: TableHelper<Article, "slug" | "title" | "category_slug">;
      agent_runs: TableHelper<AgentRun, "agent">;
      agent_logs: TableHelper<AgentLog, "message">;
      agent_run_articles: TableHelper<AgentRunArticle, "run_id" | "article_id">;
      authors: TableHelper<AuthorRow, "slug" | "name" | "title" | "bio">;
      cost_ledger: TableHelper<CostLedgerRow, "day">;
    };
    Views: Record<string, never>;
    Functions: {
      add_run_cost: {
        Args: {
          p_openai_cost: number;
          p_image_cost: number;
          p_articles: number;
          p_runs: number;
        };
        Returns: undefined;
      };
    };
    Enums: {
      article_status: ArticleStatus;
      agent_run_status: AgentRunStatus;
      agent_log_level: AgentLogLevel;
    };
    CompositeTypes: Record<string, never>;
  };
};
