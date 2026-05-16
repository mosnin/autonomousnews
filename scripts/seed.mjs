#!/usr/bin/env node
/**
 * Seed a freshly-deployed Techno Times with 10 well-crafted sample articles
 * across multiple categories so the site looks real from minute one.
 *
 * Articles are pushed via the same /api/agent/articles endpoint the Modal
 * worker uses, so this exercises the full pipeline (including IndexNow
 * pings on publish). Each article has a stable topic_key prefixed with
 * `seed-` so re-running the script triggers the living-update path instead
 * of inserting duplicates.
 *
 *   SITE_URL=https://yourdomain.com \
 *   ADMIN_API_KEY=... \
 *   node scripts/seed.mjs
 *
 * Add --draft to publish as drafts (so nothing is public until you flip
 * them in /admin/articles).
 */
import { argv, env, exit } from "node:process";

const SITE = (env.SITE_URL ?? "").replace(/\/$/, "");
const KEY = env.ADMIN_API_KEY ?? "";
const DRAFT = argv.includes("--draft");

if (!SITE || !KEY) {
  console.error("Set SITE_URL and ADMIN_API_KEY env vars.");
  exit(2);
}

const STATUS = DRAFT ? "draft" : "published";

const articles = [
  {
    slug: "ai-coding-tools-go-mainstream",
    title: "AI Coding Tools Now Used Daily by Two-Thirds of Developers",
    dek: "A new survey finds AI assistants are entrenched in workflows that did not exist three years ago — and reshaping what hiring managers look for.",
    excerpt:
      "The survey, conducted across 2,000 engineers, found that daily AI tool use has more than doubled since 2024.",
    category_slug: "technology",
    subcategory_slug: "software",
    tags: ["AI", "Developers", "Productivity"],
    author_name: "Priya Shah",
    author_slug: "priya-shah",
    is_featured: true,
    body:
      "Two-thirds of professional software developers now use AI coding assistants every day, according to a survey of 2,000 engineers published this week by an industry research firm.\n\nThe figure — 67 percent — has more than doubled since 2024, when daily use stood near 28 percent. Weekly use is approaching 90 percent. Researchers said the shift represents the fastest adoption of any developer tool in the past decade.\n\n## What changed\n\nThree forces are visible in the data. First, model quality crossed a threshold for the kinds of tasks engineers do every hour — explaining unfamiliar code, drafting boilerplate, debugging stack traces. Second, prices fell: agent-style coding assistants now cost a fraction of what they did at launch. Third, employers stopped treating the tools as experimental and began evaluating engineers on their use.\n\n>> Daily AI tool use has more than doubled since 2024, the fastest adoption curve for any developer tool in a decade.\n\n## Who benefits\n\nJunior engineers reported the largest productivity gains, the survey said, though they also reported the largest learning gaps when working without the tools. Senior engineers used them less for code completion and more for reviewing changes — a pattern hiring managers say they look for in interviews now.\n\n## Where it goes next\n\nThe survey did not address quality outcomes, and several engineering leaders interviewed for this article cautioned that velocity gains have not yet been matched by clear improvements in defect rates. The next year of data, they said, will tell whether the tools are creating sustainable productivity or technical debt that is paid back later.",
  },

  {
    slug: "fed-holds-rates-tech-rally",
    title: "Fed Holds Rates Steady; Tech Stocks Lead a Late-Day Rally",
    dek: "Powell's measured tone reassured markets after weeks of mixed signals on inflation.",
    excerpt:
      "The Federal Reserve held its benchmark rate unchanged, and equities closed sharply higher.",
    category_slug: "business",
    subcategory_slug: "markets",
    tags: ["Federal Reserve", "Markets", "Equities"],
    author_name: "Sam Reyes",
    author_slug: "sam-reyes",
    is_featured: true,
    body:
      "The Federal Reserve held its benchmark interest rate unchanged on Wednesday, leaving the federal funds rate in its current target range and signaling that policymakers were not yet prepared to commit to a path of cuts.\n\nMarkets read the decision as broadly dovish. The S&P 500 closed up 1.4 percent, the Nasdaq Composite gained 2.1 percent, and the dollar weakened against most major currencies. Treasury yields fell across the curve.\n\n## Powell's message\n\nAt his news conference, Chair Jerome Powell described the labor market as 'roughly in balance' and inflation as 'still elevated, but on a downward trajectory.' He resisted prompts to commit to a timeline.\n\n>> 'We're going to remain data-dependent,' Powell said. 'That hasn't changed.'\n\n## Why tech led\n\nLarge-cap technology stocks led the late-day move, a pattern that has repeated through this cycle. Lower expected rates mean future cash flows discount less harshly, which mathematically favors growth names. Several investors interviewed for this article said positioning, not new information, drove the size of the rally.\n\n## What's next\n\nThe next inflation print will be the most-watched data of the month. A surprise to the downside would, in the view of most rate strategists surveyed, lock in expectations of a cut at the following meeting.",
  },

  {
    slug: "spacex-starship-orbital-payload",
    title: "Starship Completes First Fully Orbital Payload Mission",
    dek: "A NASA experiment delivered, the booster recovered intact, and the program clears its highest bar yet.",
    excerpt:
      "Starship's tenth integrated flight reached a stable orbit and deployed its first paying payload.",
    category_slug: "science",
    subcategory_slug: "space",
    tags: ["SpaceX", "Starship", "NASA"],
    author_name: "Anya Patel",
    author_slug: "anya-patel",
    is_featured: true,
    body:
      "SpaceX's Starship reached a stable orbit, deployed its first paying payload, and recovered both stages intact on its tenth integrated flight, the company said early Thursday — clearing the program's highest bar yet.\n\nThe payload, a NASA-built atmospheric instrument bound for low Earth orbit, separated cleanly from Starship's upper stage about ninety minutes after launch. The Super Heavy booster returned to the launch site for a catch by the launch tower's mechanical arms. The upper stage performed a controlled splashdown in the Indian Ocean.\n\n## Why this flight matters\n\nPrior Starship flights had reached space, but none had completed a full mission: orbit, payload deploy, and recovery of both stages. Thursday's flight is the first that NASA's lunar return campaign can point to as evidence the architecture is ready for cargo missions to the Moon's vicinity.\n\n## The road ahead\n\nThe next flight, planned for early next year, will attempt an in-orbit propellant transfer between two Starships — a maneuver NASA considers prerequisite to a lunar landing.\n\n>> 'Today changes the schedule we can credibly defend,' a senior NASA program manager said.\n\nIndependent analysts cautioned that program risk remains substantial. The schedule still depends on a long chain of unproven operations.",
  },

  {
    slug: "eu-platform-accountability-act-passes",
    title: "E.U. Passes Sweeping Platform Accountability Act",
    dek: "The law's reach extends to recommendation algorithms, opening a new front in the regulation of digital media.",
    excerpt:
      "The legislation, two years in negotiation, gives Brussels direct authority over how platforms weight content.",
    category_slug: "world",
    subcategory_slug: "europe",
    tags: ["EU", "Regulation", "Platforms"],
    author_name: "Hanna Mueller",
    author_slug: "hanna-mueller",
    is_featured: true,
    body:
      "The European Parliament gave final approval on Wednesday to the Platform Accountability Act, a sweeping piece of legislation that extends Brussels' reach into the design of recommendation algorithms used by the largest social and video platforms.\n\nThe law, two years in negotiation, builds on the Digital Services Act and the Digital Markets Act passed earlier this decade. It empowers the European Commission to require independent audits of recommendation systems and, in narrow circumstances, to order changes to how content is ranked.\n\n## What it actually does\n\nThree provisions stand out. First, large platforms must publish aggregated risk reports describing what their systems are amplifying. Second, the Commission gains the right to commission independent audits at the platform's expense. Third, fines for non-compliance reach 6 percent of global turnover — a level designed to be felt at the corporate level, not just on a regional basis.\n\n## Where the friction lies\n\nU.S. platforms have warned that the law's reach extends extraterritorially. European officials counter that the law applies to companies offering services to E.U. users, regardless of where they are headquartered. The first audit cycles are due to begin within eighteen months.\n\n>> 'The platforms are no longer in sole charge of how their own systems work,' said an E.U. official involved in drafting the law.\n\n## Implementation timeline\n\nThe Act enters into force thirty days after publication in the Official Journal. Compliance deadlines run from twelve to thirty months depending on platform size and risk classification.",
  },

  {
    slug: "ransomware-european-grid-operator",
    title: "Ransomware Attack Disrupts European Grid Operator",
    dek: "An incident at one of Europe's largest transmission system operators is forcing fresh scrutiny on critical-infrastructure defenses.",
    excerpt:
      "Engineers regained control within twenty-four hours, but the inquest may run for months.",
    category_slug: "technology",
    subcategory_slug: "cybersecurity",
    tags: ["Cybersecurity", "Energy", "Infrastructure"],
    author_name: "Lucas Brandt",
    author_slug: "lucas-brandt",
    is_live: true,
    body:
      "A ransomware attack against one of Europe's largest transmission system operators disrupted internal control systems for roughly twenty-four hours this week, forcing the operator to fall back on manual procedures and reigniting a long-running argument about how to defend critical infrastructure.\n\nThe operator declined to be named while the investigation was ongoing. Government cyber agencies in two countries confirmed they were involved.\n\n## What we know so far\n\nThe attack appears to have targeted internal business systems first, then propagated to a small number of operational consoles. Officials said the transmission grid itself was not disrupted; failover procedures kept electricity flowing through the affected region without interruption to households.\n\n## Why this case is unusual\n\nMost ransomware that touches energy operators stops at office systems. This one reached operations consoles before defenders contained it. Security researchers tracking the campaign attributed it, with moderate confidence, to a financially motivated group that has used similar techniques against logistics and healthcare targets.\n\n>> 'The trend line is the part to watch,' a European cyber-defense official said. 'Whether or not this exact group keeps trying.'\n\n## What changes from here\n\nE.U. officials said they expected the incident to inform the next round of NIS2 enforcement actions. National regulators are likely to require additional segmentation between business and operational networks across the energy sector.",
  },

  {
    slug: "chip-export-rules-tighten-2026",
    title: "U.S. Tightens Chip Export Rules, Citing National Security",
    dek: "New restrictions target advanced GPUs and the design software behind them, with European allies asked to follow.",
    excerpt:
      "The Commerce Department issued an expanded export-control list Friday morning.",
    category_slug: "politics",
    subcategory_slug: "foreign-policy",
    tags: ["Chips", "Export Controls", "China"],
    author_name: "Jordan Park",
    author_slug: "jordan-park",
    is_featured: true,
    body:
      "The Commerce Department on Friday issued an expanded list of chip-related export controls, tightening rules on advanced graphics processors and the electronic-design-automation software used to make them.\n\nThe rules close several pathways that companies had used to ship reconfigured versions of high-end products that fell just under earlier thresholds. They also apply, for the first time, to a category of design software previously exempt from licensing requirements.\n\n## What is restricted\n\nThree categories changed. First, GPUs above a defined compute threshold now require a license for export to a longer list of countries. Second, EDA software at the most advanced process nodes is added to the controls. Third, the rules expand the definition of 'U.S. person' for purposes of the controls' service prohibitions.\n\n## Allied coordination\n\nThe administration said it had consulted with Japan and the Netherlands ahead of the announcement and had asked European partners to align their own export-control frameworks. The European Commission said it was reviewing the rules but did not commit to a timeline.\n\n>> 'We need our allies to move,' a senior Commerce official said. 'Otherwise the controls leak.'\n\n## What companies are saying\n\nMajor U.S. chipmakers said they would comply but warned that the controls would reduce addressable market in the near term. Industry analysts said the practical effect depended heavily on how aggressively the rules are enforced — a perennial question in this area.",
  },

  {
    slug: "indie-studio-game-of-the-year",
    title: "A Two-Person Studio Just Won Game of the Year",
    dek: "How a small team beat the biggest publishers — and what it says about taste in 2026.",
    excerpt:
      "A two-person studio took the industry's highest honor. The reaction online was as much about the industry as the game.",
    category_slug: "culture",
    subcategory_slug: "internet-culture",
    tags: ["Gaming", "Indie", "Awards"],
    author_name: "Devin Okafor",
    author_slug: "devin-okafor",
    body:
      "Two people made the game that won this year's Game of the Year. They were not at the show. They watched from a small office in a city neither of them grew up in. They wore the same shirts they had been wearing all week.\n\nThe game is short — fewer than ten hours. It is mostly text. It looks, in places, like a spreadsheet. It is also, by the math of a hundred outlets and a few hundred thousand voters, the best thing the industry made this year.\n\n## What the room felt\n\nThe big publishers had brought their usual delegations. There was the usual long applause for the usual large game. Then the announcement, and a half-second of silence, and then the kind of cheer that you get when the room realizes it is participating in a story it likes.\n\n>> The reaction online was as much about the industry as the game itself.\n\n## What it took\n\nFour years. A small loan. A friend's couch for a while. A publishing deal signed twelve months ago that one of the founders later described as 'embarrassingly modest.' No marketing campaign. No paid creators. Word of mouth, and a slow build, and a community of people who told everyone they knew.\n\n## What it means\n\nNot much, probably, for the structure of the industry. Hits like this come along every few years, and the major publishers' long-term incentives do not change because of one of them. But it means a great deal to the people the game's existence proves possible.",
  },

  {
    slug: "climate-loss-and-damage-fund-launches",
    title: "Loss-and-Damage Fund Begins Disbursing to Climate-Vulnerable Nations",
    dek: "Three years after it was promised, the first checks have arrived. The amounts are small. The political weight is not.",
    excerpt:
      "Five Pacific nations received the first tranches of the long-promised fund this month.",
    category_slug: "climate",
    subcategory_slug: "crisis",
    tags: ["Climate", "UN", "Adaptation"],
    author_name: "Marcus Aoki",
    author_slug: "marcus-aoki",
    body:
      "Three years after wealthy nations agreed in principle to underwrite a loss-and-damage fund for the countries that had contributed least to climate change and were suffering most from it, the first disbursements are arriving.\n\nFive Pacific island nations received the first tranches this month — modest amounts in budget terms, large in political ones. Bangladesh and several African nations are expected to receive funding in the next cycle.\n\n## What the money does\n\nThe fund is not for reducing emissions. It is for the costs that adaptation cannot prevent — sea-walls that did not hold, crops that did not grow, infrastructure that did not survive a storm of a kind people did not used to plan for.\n\n## Why the amounts disappoint\n\nThe pledges, taken together, fall well short of the figures that climate-affected nations have been calling for. Wealthier countries argued that the fund needed to walk before it could run, and that the pledge round next year would be where serious commitments are made.\n\n>> 'The first checks matter even when they are small,' a Pacific climate envoy said. 'They make the promise real.'\n\n## What to watch\n\nThe next set of pledges is due at the climate summit in autumn. Several observers said the test of the fund was not the amount on paper but the durability of the disbursement mechanism through political turnover in the contributing countries.",
  },

  {
    slug: "world-cup-final-record-audience",
    title: "World Cup Final Draws Record Television Audience",
    dek: "More than two billion people watched at least part of the match, a streaming-era milestone for an old format.",
    excerpt:
      "FIFA and Nielsen put the cumulative global audience at 2.1 billion people.",
    category_slug: "sports",
    subcategory_slug: "soccer",
    tags: ["World Cup", "Soccer", "Television"],
    author_name: "Theo Kane",
    author_slug: "theo-kane",
    body:
      "More than two billion people watched at least part of the World Cup final, FIFA and Nielsen said this week, a record for the tournament and a milestone for live televised sport in an era when global audiences are supposed to be shrinking.\n\nThe match itself was a tactical, low-scoring affair that produced a moment of theater in the second half and a second moment in stoppage time. The result will be argued for years.\n\n## What the audience number means\n\nThe two-billion figure is a cumulative reach — the number of people who watched at any point. The average minute audience was smaller, though still the largest ever recorded for the tournament. Streaming, not broadcast, drove the growth, but the broadcast number was up too.\n\n>> Streaming, not broadcast, drove the growth — but the broadcast number was up too.\n\n## Why the format keeps winning\n\nLive sport is one of the few categories where appointment viewing has held up. The tournament's format — a known schedule, a known cast, a known stake — is built for the kind of attention that platforms find hardest to manufacture. Sponsors paid record amounts, and they appear to be paying for something real.\n\n## What sports leagues take from it\n\nThe number is being read closely by leagues whose own broadcast deals come up in the next two years. The pattern, several executives interviewed said, is clear: the audience for the biggest events is bigger than ever; the audience for the everyday games is more diffuse than ever.",
  },

  {
    slug: "openai-launches-agentic-platform",
    title: "OpenAI Unveils Agentic Platform, Reshaping the AI Developer Stack",
    dek: "The company's new agent runtime promises persistent memory, tool use and a marketplace — putting it on a collision course with Anthropic and Google.",
    excerpt:
      "OpenAI's new platform formalizes agents as first-class citizens of its API.",
    category_slug: "technology",
    subcategory_slug: "artificial-intelligence",
    tags: ["OpenAI", "AI Agents", "Developer Tools"],
    author_name: "Mira Chen",
    author_slug: "mira-chen",
    is_breaking: true,
    is_featured: true,
    body:
      "OpenAI on Tuesday unveiled an agentic platform that promises persistent memory, native tool use and a marketplace for third-party agents — formalizing agents as first-class citizens of its API and putting the company on a collision course with rival platforms from Anthropic and Google.\n\nThe announcement, made at a developer event in San Francisco, marks the most significant change to OpenAI's product surface since it released its first chat-tuned models. It also reflects a wider industry bet: that the next chapter of the AI economy will be built less around chat interfaces and more around software that does work on a user's behalf.\n\n## What is in the platform\n\nThree pieces stand out. First, persistent memory: agents can carry state across sessions in a managed store, with developer-controlled retention. Second, a tool-use runtime that handles routing between models and external functions with built-in retries. Third, a marketplace where developers can list agents and where users can deploy them with a click.\n\n## Why this is a turning point\n\nFor most of the past two years, agent frameworks lived in third-party libraries. Developers stitched together memory, tool use and orchestration themselves. Tuesday's announcement collapses much of that into the platform layer. Several developers interviewed after the event said the bigger question was the cost: persistent memory at scale is expensive, and OpenAI's pricing model will shape which agents are commercially viable.\n\n>> 'Agents have been almost-here for two years,' one founder said. 'This is the platform shipping its part.'\n\n## The competitive backdrop\n\nAnthropic's Claude has been ahead on the kinds of long-running coding agents that some developers prefer. Google has integrated its own agent stack across Workspace. Tuesday's announcement narrows OpenAI's lag on persistent state — but the next year of competition will be decided on price, latency and the depth of integrations.",
  },
];

let ok = 0;
let fail = 0;

for (const a of articles) {
  const body = {
    ...a,
    source_urls: [],
    status: STATUS,
    is_breaking: !!a.is_breaking,
    is_featured: !!a.is_featured,
    is_live: !!a.is_live,
    topic_key: `seed-${a.slug}`,
    ai_disclosed: true,
    read_minutes: a.read_minutes ?? Math.max(2, Math.round(a.body.split(/\s+/).length / 220)),
  };
  try {
    const r = await fetch(`${SITE}/api/agent/articles`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`${r.status} ${text.slice(0, 200)}`);
    }
    const j = await r.json();
    console.log(`\x1b[32mOK  \x1b[0m ${j.updated ? "updated" : "inserted"}  ${a.slug}`);
    ok++;
  } catch (e) {
    console.log(`\x1b[31mFAIL\x1b[0m ${a.slug}  ${e.message}`);
    fail++;
  }
}

console.log(`\n  pushed ${ok}  failed ${fail}  status=${STATUS}\n`);
exit(fail > 0 ? 1 : 0);
