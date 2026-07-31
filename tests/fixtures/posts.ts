import type { PostFeatures } from '../../src/engine/types';
import { extractHashtags, splitLines } from '../../src/engine/tokenize';

export type FixtureLabel = 'ai' | 'brag' | 'clean';

export interface Fixture {
  name: string;
  expected: FixtureLabel;
  post: PostFeatures;
  /**
   * Set on posts that are genuinely hard calls — used to report accuracy
   * separately so a borderline case does not silently become the spec.
   */
  borderline?: boolean;
}

let seq = 0;

function post(text: string, overrides: Partial<PostFeatures> = {}): PostFeatures {
  seq += 1;
  return {
    urn: `urn:li:activity:${seq}`,
    authorName: 'Test Author',
    authorId: `author-${seq}`,
    text,
    lines: splitLines(text),
    hashtags: extractHashtags(text),
    hasMedia: false,
    isRepost: false,
    isPromoted: false,
    ...overrides,
  };
}

function slopAi(name: string, text: string, borderline = false): Fixture {
  return { name, expected: 'ai', post: post(text), borderline };
}

function slopBrag(name: string, text: string, borderline = false): Fixture {
  return { name, expected: 'brag', post: post(text), borderline };
}

function clean(name: string, text: string, borderline = false): Fixture {
  return { name, expected: 'clean', post: post(text), borderline };
}

export const FIXTURES: Fixture[] = [
  // ---------------------------------------------------------------- AI slop
  slopAi(
    'emoji-bulleted listicle',
    `I asked 100 founders what separates the top 1%.

The answers surprised me.

🚀 They wake up before the world does
💡 They read 60 minutes a day
✅ They say no to almost everything
🔥 They obsess over one metric
📌 They never stop learning

The difference isn't talent. It's consistency.

Agree?

#leadership #innovation #mindset #success #growth`,
  ),
  slopAi(
    'fake bold formatter',
    `𝗧𝗵𝗲 𝟯 𝘀𝗸𝗶𝗹𝗹𝘀 𝗲𝘃𝗲𝗿𝘆 𝗣𝗠 𝗻𝗲𝗲𝗱𝘀 𝗶𝗻 𝟮𝟬𝟮𝟲

Most product managers get this wrong.

They focus on features. They should focus on outcomes.

Here's the thing: your roadmap is not your strategy.

What would you add?`,
  ),
  slopAi(
    'llm vocabulary soup',
    `In today's fast-paced business environment, organizations must navigate the complex landscape of digital transformation.

Let's delve into why a holistic approach to change management is a game-changer for the future of work.

Furthermore, leveraging cutting-edge tools can revolutionize how teams collaborate. Moreover, it is worth noting that a paradigm shift is already underway.

Key takeaways: culture eats strategy for breakfast.

In conclusion, the organizations that adapt will thrive.`,
  ),
  slopAi(
    'staccato cadence with antithesis',
    `I fired my best performer last week.

Not because of results.

Because of how he treated the intern.

Talent is cheap.

Character is not.

Your top performer isn't your best employee. It's the one who lifts everyone else.

Culture is built in the moments nobody is watching.

Let that sink in.`,
  ),
  slopAi(
    'engagement bait giveaway',
    `I built a 42-page playbook on B2B cold email.

It took me 6 months.

Today I'm giving it away for free.

Comment "PLAYBOOK" and I'll send you the link.

♻️ Repost if you found this useful.

Follow me for more growth tips.`,
  ),
  slopAi(
    'hashtag stuffing on thin content',
    `Consistency beats intensity. Every single time.

#leadership #innovation #motivation #mindset #success #growth #productivity #career #business #networking`,
  ),
  slopAi(
    'em-dash heavy generated essay',
    `Leadership — real leadership — is not about authority. It is about attention.

The best managers I have worked with — and I have worked with many — share one habit. They listen more than they speak. They ask questions — good ones — before offering answers.

This is not a soft skill — it is the hardest skill. It requires patience, humility, and a willingness to be wrong in public.

The teams that thrive are the ones where people feel heard.`,
  ),
  slopAi(
    'stop scrolling hook',
    `Stop scrolling.

This one habit changed my entire career.

Every morning at 5am, before email, before Slack, before the noise, I write for 30 minutes.

That's it. That's the habit.

Plot twist: the writing was never the point. The thinking was.

Thoughts?`,
  ),
  slopAi(
    'uniform sentence rhythm',
    `Great teams are not built by accident today. They are built by deliberate daily choices. Every conversation either adds or removes trust. Every deadline either builds or breaks momentum. Every hire either raises or lowers the bar. Every meeting either creates or destroys clarity. The pattern is always the same here. Small decisions compound into large outcomes.`,
    true,
  ),
  slopAi(
    'unpopular opinion template',
    `Unpopular opinion: your resume doesn't matter.

I've hired 200+ people.

I've never once made a decision based on a resume.

Here's what I actually look for:

👉 Curiosity over credentials
👉 Evidence over adjectives
👉 Questions over answers

Read that again.

What would you add?`,
  ),

  // -------------------------------------------------------------- Brag slop
  slopBrag(
    'humbled and honored award',
    `Humbled and honored to share that I have been named one of the Top 50 Marketing Voices of 2026.

Beyond grateful to my team, my mentors, and everyone who believed in me when I was just getting started.

This one is for my parents, who came to this country with nothing.

Still processing this. 🙏`,
  ),
  slopBrag(
    'thrilled to announce promotion',
    `Thrilled to announce that I have been promoted to Senior Director of Engineering at Acme.

Five years ago I was writing my first line of production code. Today I lead an organization of 80 engineers.

None of this would have been possible without the people who took a chance on me.

Onwards and upwards. 🚀`,
  ),
  slopBrag(
    'revenue flex',
    `We just crossed $2.4M ARR with a team of four.

No VC money. No growth hacks. No paid ads.

18 months ago we had 0 customers. Today we have 1,200.

I don't usually post about revenue, but I think transparency helps other founders.

Here's exactly what we did.`,
  ),
  slopBrag(
    'parable with moral',
    `A candidate showed up 15 minutes late to our final interview.

My co-founder wanted to end it right there.

"Give me five minutes," I said.

Turns out her train had been cancelled and she had run the last two kilometres in the rain rather than reschedule.

We hired her. She is now our best account manager.

The lesson? Judge people on how they handle the bad day, not the good one.`,
  ),
  slopBrag(
    'follower milestone',
    `10,000 followers.

When I posted for the first time 14 months ago, three people liked it. One of them was my mother.

Words can't describe how grateful I am for this community.

Thank you for reading, commenting, and challenging me.

The best is yet to come.`,
  ),
  slopBrag(
    'humility flex on speaking gig',
    `Not bragging, but I still can't believe I got to share a stage with people I have admired for a decade.

Beyond grateful for the invitation to keynote at TechSummit 2026.

Little did I know when I started that a hobby blog would lead here.

Dream come true. 🙏`,
  ),
  slopBrag(
    'certification announcement',
    `Excited to share that I have officially earned my AWS Solutions Architect Professional certification!

Three months of studying. Countless late nights. One very patient partner.

Grateful for the support along the way. On to the next challenge!`,
    true,
  ),

  // ------------------------------------------------- German-language slop
  slopAi(
    'german emoji listicle',
    `𝗗𝗶𝗲 𝟯 𝗙𝗲𝗵𝗹𝗲𝗿, 𝗱𝗶𝗲 𝟵𝟬% 𝗮𝗹𝗹𝗲𝗿 𝗙ü𝗵𝗿𝘂𝗻𝗴𝘀𝗸𝗿ä𝗳𝘁𝗲 𝗺𝗮𝗰𝗵𝗲𝗻

Unpopuläre Meinung: Dein Titel macht dich nicht zur Führungskraft.

✅ Zuhören statt reden
🚀 Vertrauen statt Kontrolle
💡 Fragen statt Antworten

Es geht nicht um Macht. Es geht um Verantwortung.

Wie siehst du das?

#leadership #mindset #innovation #erfolg #karriere #business`,
  ),
  slopAi(
    'german engagement bait',
    `Hör auf zu scrollen.

Ich habe 200 Bewerbungsgespräche geführt.

Das hier ist mir aufgefallen.

Die besten Kandidaten stellen mehr Fragen als sie beantworten.

Sie reden nicht über Gehalt. Sie reden über Wirkung.

Merk dir das.

Folge mir für mehr Einblicke aus dem Recruiting.`,
  ),
  slopBrag(
    'german announcement humblebrag',
    `Ich freue mich sehr, bekannt zu geben, dass ich ab September die Leitung des Bereichs Data Science übernehme.

Demütig und dankbar für das Vertrauen und für ein Team, das mich jeden Tag besser macht.

Wer hätte das gedacht, als ich vor acht Jahren als Werkstudent angefangen habe.

Das Beste kommt noch. 🚀`,
  ),
  slopBrag(
    'promotional pivot with tracked link',
    `This is the fall of the Library of Alexandria all over again 🫣

AI labs are buying up rare books, cutting the binding off the spine, feeding the pages through a scanner, then shredding the paper. Once it is shredded, no reprint brings it back.

Books printed before 2022 sell at a premium because they predate the flood of AI-generated text. Clean human writing is what every model is running short of.

That scarcity is the point. Owning data no competitor can copy is what separates the models that win from the ones that fade.

That is why we built ToneUp, an AI go-to-market engine trained on data earned by helping companies reach the right people.

We are raising now. Learn more and earn bonus shares here: https://lnkd.in/dXXXXXXX`,
  ),

  // Taken from a real feed capture, lightly trimmed. Reported by the user as
  // obvious slop that scored too low: the survey-listicle hook and the pivot
  // fired, but the opener, the CTA, the scale flex and the closing poll did not.
  slopAi(
    'survey listicle pivoting to a fundraise',
    `People are kinder to LLMs than to each other??

Here's what the research says...

A survey of over 1,000 people, run by Future, looked at how people talk to AI.

The numbers say a lot.
✍️ 70% of people are polite to AI overall, saying please and thank you.
✍️ Most people do it simply because it feels right, not because they're told to.
✍️ Around 12% admitted a smaller motive sits underneath the politeness.
✍️ On the flip side, a chunk of impolite users aren't rude on purpose.
✍️ One researcher pointed to smth worth remembering: polite prompts can noticeably improve output (!!)

So no, people aren't always kinder to bots than to humans.

Funny enough, GenAI Works started the same way: one community, growing into something bigger.

14M+ people first.
Then companies like NVIDIA and Oracle came on board.
Add a course platform with 100K+ students, and you get ToneUp.

We're raising through the end of August.

Early backers get bonus shares up to 22%.

Come see what we're building: https://lnkd.in/eFPtSfTF

Are you one of the polite ones, or do you keep your prompts short and to the point?`,
  ),

  // ------------------------------------------------------------------ Clean
  clean(
    'plain technical question',
    `Has anyone migrated a large Rails monolith to Postgres 17 with logical replication? We are hitting replication lag spikes during the initial sync on tables above 200M rows and I am not sure whether to chunk the copy or throttle it. Happy to share our config if it helps anyone else.`,
  ),
  clean(
    'short factual update',
    `We open sourced our internal feature flag library today. It is MIT licensed, has no runtime dependencies, and works with any Node version above 20. Link in the comments.`,
  ),
  clean(
    'conference talk announcement, no flex',
    `I am giving a talk on incident response at SREcon next month. The abstract is about why postmortem templates fail in small teams. If you are attending and want to compare notes beforehand, send me a message.`,
  ),
  clean(
    'job posting',
    `We are hiring a backend engineer in Berlin. Go and Postgres, hybrid two days a week, salary band is 75-95k and published in the job ad. No take-home assignment. Full description on our careers page.`,
  ),
  clean(
    'genuine long analysis',
    `Spent the weekend reading the new EU AI Act guidance on general purpose models. Two things stood out. First, the transparency obligations apply upstream, which means model providers carry documentation duties even when the deployer is the one facing users. Second, the systemic risk threshold is defined by training compute, which is a strange proxy given how much efficiency has improved in the last year. I think the compute threshold gets revised within 18 months. Curious whether anyone working on compliance reads it differently.`,
  ),
  clean(
    'personal news stated plainly',
    `After six years I am leaving Contoso this month. I am proud of what the platform team built and I will miss the people. Taking August off to sail, then starting somewhere new in September. If you are working on developer tooling, I would like to hear about it.`,
  ),
  clean(
    'enthusiastic but genuine team credit',
    `Our team shipped the new billing system last night after nine months of work. Migrating 400,000 active subscriptions with zero downtime was the hardest engineering problem I have worked on. Enormous credit to Priya, who wrote the reconciliation logic that caught three bugs we would otherwise have found in production.`,
    true,
  ),
  clean(
    'question with a question mark, not bait',
    `Does anyone have experience with the new Chrome extension review timelines? We submitted a minor permission change nine days ago and it is still pending. Is that normal now?`,
  ),
  clean(
    'article share with real opinion',
    `Good piece on why RAG evaluation is mostly vibes. The author's point about retrieval metrics being uncorrelated with answer quality matches what we measured internally last quarter. Our recall at 10 went up 12 points and human ratings did not move at all.`,
  ),
  clean(
    'short congratulation to someone else',
    `Congratulations to Maria on the new role. She rebuilt our data platform from scratch and made it look easy. Any team would be lucky to have her.`,
  ),
  clean(
    'technical writeup with em-dashes used normally',
    `We replaced our cron-based job runner with a durable execution engine. The migration took three weeks — most of it spent making existing jobs idempotent, which we should have done years ago. Throughput is unchanged but on-call pages dropped from about nine a week to one.`,
  ),
  clean(
    'list post that is actually informative',
    `Notes from debugging a memory leak in a Node service, in case it saves someone a day:

The heap snapshot showed retained closures in the HTTP agent.
The cause was a keep-alive agent created per request instead of per process.
The fix was four lines.
Memory went from 2GB after an hour to a flat 180MB.`,
  ),
  clean(
    'asking for recommendations',
    `Looking for recommendations on static analysis tools for Terraform that do not require sending plans to a vendor cloud. We are fine with paying, we are not fine with the data leaving our network.`,
  ),
  clean(
    'german substantive post about a real incident',
    `Am 25. und 26. Juli waren tausende geteilte Claude-Chats über Google auffindbar. Gehackt hat dafür niemand etwas. Den Seiten mit den Teilen-Links fehlte das kleine Signal, das einer Suchmaschine sagt, diese Seite gehört nicht in den Index.

Laut den Berichten lagen darin Krypto-Schlüssel, Anfragen an Anwälte, Mitarbeiterbewertungen und interne Unterlagen.

Der Teilen-Button fühlt sich an wie eine Mail an eine Person. In der Praxis ist er eine Veröffentlichung ohne Passwort. Wer den Link hat, ist drin.

In den Einstellungen unter Datenschutz stehen deine geteilten Chats, bei Claude wie bei ChatGPT. Geh einmal durch, was davon noch offen ist.`,
  ),
  clean(
    'german plain job posting',
    `Wir suchen eine Backend-Entwicklerin in Köln. Go und Postgres, hybrid zwei Tage pro Woche, Gehaltsband steht in der Ausschreibung. Kein Take-Home-Test. Details auf unserer Karriereseite.`,
  ),
  clean(
    'german technical writeup',
    `Wir haben unseren cron-basierten Job-Runner durch eine Durable-Execution-Engine ersetzt. Die Migration hat drei Wochen gedauert, das meiste davon dafür, bestehende Jobs idempotent zu machen. Der Durchsatz ist unverändert, aber die On-Call-Alarme sind von etwa neun pro Woche auf einen gefallen.`,
  ),
  clean(
    'meeting notes style',
    `Three things I got wrong in our pricing migration. We announced before the billing code was fully tested. We gave customers 30 days notice when the contract required 60. And we did not brief support until the day of. All three were avoidable and all three were mine.`,
    true,
  ),
];

export const AI_FIXTURES = FIXTURES.filter((f) => f.expected === 'ai');
export const BRAG_FIXTURES = FIXTURES.filter((f) => f.expected === 'brag');
export const CLEAN_FIXTURES = FIXTURES.filter((f) => f.expected === 'clean');

export { post as makePost };
