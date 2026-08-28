export const profile = {
  name: 'Rich S. Ferrera',
  title: 'Senior Product Leader',
  focus: 'Patient Platforms · Identity · Healthcare Products',
  phone: '(802) 455-8432',
  email: 'richferraraproductmgmt@gmail.com',
  linkedin: 'https://www.linkedin.com/in/richsferrara/',
  linkedinLabel: 'linkedin.com/in/richsferrara',
  positioning:
    'I build connected platforms that turn fragmented identity, data, integration, and developer capabilities into reusable enterprise ecosystems.',
  summary:
    'I\u2019m a senior product leader with 15+ years of experience building and scaling platform, identity, data, and AI-powered products in complex, regulated environments. My work sits at the intersection of product strategy, enterprise architecture, and transformation\u2014connecting capabilities that are often managed in silos and turning them into shared foundations that can be reused across products, teams, and customer experiences.\n\nIncreasingly, I operate at the Director level: defining strategy across interconnected domains, aligning executives and technical leaders around a common vision, guiding cross-functional teams through ambiguity, and establishing the platforms, governance, and operating models organizations need to scale with greater clarity, security, speed, and leverage.',
  summaryExtended:
    'Today I lead strategy across client management, consent management, and enterprise identity and access management for California\u2019s Behavioral Health Transformation \u2014 including canonical model design, master client profile strategy, people matching, interoperability, and enterprise authorization. Earlier, I led enterprise platform and data product work at Capital One, AI-powered self-service and personalization at Intuit, and CIAM modernization in banking. I consistently operate at the intersection of product, engineering, policy, operations, and leadership to solve hard platform problems, create durable systems, and deliver measurable outcomes.',
}

export const metrics = [
  {
    value: '15+',
    label: 'Years leading product',
    detail: 'Across healthcare, financial services, and SaaS.',
  },
  {
    value: '$1.9M',
    label: 'Monthly revenue driven',
    detail: 'Via AI-powered recommendation & self-service at Intuit.',
  },
  {
    value: '20K+',
    label: 'Active platform users',
    detail: 'Enterprise developer & data platform at Capital One.',
  },
  {
    value: '200+',
    label: 'Services unified',
    detail: 'Internal & external services on a governed platform.',
  },
  {
    value: '6 mo',
    label: 'Faster time to market',
    detail: 'Through reusable, governed platform patterns.',
  },
  {
    value: '1',
    label: 'U.S. patent granted',
    detail: 'US11809398B1 \u2014 connecting data across non-standard schemas.',
  },
]

export const competencies = [
  'Platform Product Strategy',
  'Identity & Access Management',
  'Data Governance & Canonical Modeling',
  'API & Developer Platforms',
  'Generative AI',
  'Consent & Interoperability',
  'Governance, Risk & Compliance (GRC)',
  'Data Transformation',
  'User Journey Design',
  'Cross-Functional Leadership',
  'Strategic Roadmaps',
  'Stakeholder Engagement',
]

export type CaseStudy = {
  id: string
  index: string
  company: string
  descriptor: string
  role: string
  timeframe: string
  headline: string
  problem: string
  approach: string
  outcome: string
  skills: string[]
  whyItMatters: string
  screenshot?: { src: string; alt: string }
}

export const caseStudies: CaseStudy[] = [
  {
    id: 'california-bht',
    index: '01',
    company: 'California Behavioral Health Transformation',
    descriptor:
      'A statewide public-sector healthcare initiative modernizing behavioral health access, patient consent, identity, and interoperability across counties, providers, and partners.',
    role: 'Principal Product Manager, Consultant',
    timeframe: '2025 \u2013 Present',
    headline: 'Building a Statewide Consent, Identity & Interoperability Foundation',
    problem:
      'California needed a scalable, compliant way to manage patient consent across a fragmented behavioral health ecosystem. Consent could not function as a standalone feature \u2014 it depended on trusted identity, people matching, secure access controls, and interoperable workflows across EHRs, partner organizations, APIs, and digital channels. Without a shared platform model, the state faced risks around inconsistent consent enforcement, duplicate records, weak auditability, and poor interoperability.',
    approach:
      'I led product strategy across the Consent Management Platform, enterprise identity and access management, and related client management capabilities. I shaped the roadmap for consent capture, retrieval, revocation, and auditability across web, mobile, API, and EHR-integrated workflows. In parallel, I defined foundational direction for canonical models, master client profile strategy, people matching, and identity/access patterns including RBAC, ABAC, SSO/OIDC, MFA, and delegated administration \u2014 aligning engineering, architecture, policy, legal, and operations on source-of-truth decisions, service boundaries, FHIR integration, and secure onboarding. I also used Generative AI tools to accelerate requirements, feature design, and technical flow prototyping.',
    outcome:
      'A stronger statewide foundation for patient consent management, built as a governed platform capability rather than a point solution. The work established a clearer path for secure patient access, consent enforcement, canonical identity, and interoperable data exchange across a highly regulated ecosystem \u2014 laying durable foundations to support future scaling across patient, provider, payer, and platform workflows.',
    skills: [
      'Product strategy',
      'Healthcare interoperability',
      'Consent management',
      'Canonical data modeling',
      'Master client profile',
      'People matching',
      'Enterprise IAM',
      'RBAC / ABAC',
      'OAuth / OIDC / SSO / MFA',
      'FHIR / EHR integration',
      'Cross-functional alignment',
      'AI-assisted product development',
    ],
    whyItMatters:
      'This demonstrates my ability to lead one of the hardest types of product challenges: building foundational platform capabilities in a regulated environment where identity, consent, interoperability, and governance all intersect. It shows principal-level ownership, technical fluency, and the ability to shape systems that support years of future product growth.',
  },
  {
    id: 'arvest-ciam',
    index: '02',
    company: 'Arvest Bank',
    descriptor:
      'A regional financial institution modernizing digital identity, authentication, and secure customer access across banking channels.',
    role: 'Principal Product Manager, Consultant \u2014 CIAM',
    timeframe: '2024 \u2013 2025',
    headline: 'Modernizing Customer Identity & Access in Banking',
    problem:
      'Arvest needed to modernize customer identity and access across retail banking, treasury management, and support channels. Legacy authentication and enrollment patterns created friction for customers, operational complexity for the bank, and limitations in how fraud controls, MFA, and secure access policies could scale \u2014 all without breaking existing customer experiences or downstream operational support.',
    approach:
      'I led product strategy across CIAM modernization, including authentication, enrollment, MFA, fraud-aware access, and customer identity workflows. Partnering with engineering, security, operations, and business teams, I defined the roadmap for modernizing identity capabilities and improving secure access patterns. This included driving migration to Ping Identity and Ping Protect, refining authentication policy and risk-aware controls, and aligning identity workflows with support and service operations \u2014 balancing customer experience, security posture, regulatory expectations, and platform consistency while reducing migration risk.',
    outcome:
      'A more scalable and secure identity platform strategy that strengthened authentication, policy-based access, and fraud-aware customer journeys across digital banking. The work improved the foundation for MFA, enrollment, and secure access while creating more consistent identity patterns across channels in a regulated financial services environment.',
    skills: [
      'CIAM strategy',
      'Authentication & authorization',
      'MFA',
      'Identity modernization',
      'Ping Identity / Ping Protect',
      'Fraud-aware access controls',
      'Regulated financial services',
      'Stakeholder management',
      'Platform migration strategy',
      'Customer journey design',
      'Risk & compliance alignment',
    ],
    whyItMatters:
      'This highlights my ability to lead high-risk modernization efforts where security, platform reliability, regulatory requirements, and customer experience all need to improve at the same time. It also shows direct experience with identity as a product surface that real customers depend on.',
  },
  {
    id: 'capital-one-platform',
    index: '03',
    company: 'Capital One',
    descriptor:
      'A Fortune 100 financial services company building enterprise-scale developer, data, and platform capabilities across internal and external ecosystems.',
    role: 'Senior Product Manager \u2014 Enterprise Data / Developer Platform',
    timeframe: '2014 \u2013 2022',
    headline: 'Scaling an Enterprise Developer & Data Platform',
    problem:
      'Engineering teams across the enterprise needed better ways to discover, access, govern, and reuse shared data and platform services. Without stronger platform capabilities, teams duplicated effort, onboarded inconsistently, and slowed delivery through fragmented patterns for shared services. Capital One needed a more scalable developer and data platform approach that balanced usability, governance, secure access, and time-to-market.',
    approach:
      'I led product strategy for enterprise developer and data platform capabilities supporting service discovery, metadata visibility, lineage, governed access, and reusable service adoption. My work shaped developer portal capabilities, lifecycle patterns for shared services, CI/CD-adjacent onboarding and delivery models, and platform governance frameworks that improved how teams discovered and consumed APIs and data products. I partnered across product, engineering, architecture, and platform stakeholders to reduce fragmentation, improve onboarding, and increase adoption of reusable services at scale.',
    outcome:
      'The platform scaled to support more than 200 internal and external services and 20,000 active users, contributing to 20% platform growth over two years and reducing time to market by six months. More broadly, the work shifted the organization toward reusable, governed platform patterns rather than one-off implementations \u2014 improving developer productivity, platform adoption, and enterprise leverage.',
    skills: [
      'Developer platform strategy',
      'Data platform product management',
      'Developer portal',
      'Metadata & lineage',
      'Governed access',
      'API products',
      'Platform governance',
      'Service onboarding',
      'Reusable service models',
      'Stakeholder alignment',
      'Platform adoption metrics',
      'Enterprise product strategy',
    ],
    whyItMatters:
      'This demonstrates my ability to lead platform products that create leverage across large engineering organizations. It shows how I think about product strategy for shared capabilities: reduce friction, improve reuse, strengthen governance, and deliver measurable gains in scale and time to market.',
    screenshot: {
      src: '/images/capital-one-platform-diagram.png',
      alt: 'Capital One enterprise platform architecture diagram showing Core Asset Model & Services, Asset Management, Discovery & Personalization, Governance, Collaboration, and User Experience Enablers',
    },
  },
  {
    id: 'intuit-ai-support',
    index: '04',
    company: 'Intuit',
    descriptor:
      'Global financial software company serving small businesses and consumers through QuickBooks, TurboTax, and Mailchimp.',
    role: 'Senior Product Manager \u2014 QuickBooks Global Help & Support',
    timeframe: '2022 \u2013 2024',
    headline: 'Scaling AI-Powered Self-Service & Personalized Support',
    problem:
      'QuickBooks customers often needed help during high-intent, time-sensitive moments \u2014 tax preparation, account management, product troubleshooting. Traditional help content and static support experiences were not surfacing the most relevant guidance fast enough, which increased customer effort, reduced self-service success, and drove unnecessary assisted support costs. The challenge was to improve digital support in a way that felt more personalized, intelligent, and scalable across a global customer base.',
    approach:
      'I owned the global self-service and digital help platform for QuickBooks, leading product strategy for AI-powered support, FAQ, and personalized recommendation experiences. My work used behavioral signals, customer context, and intent to improve how support content was surfaced and consumed. I guided the integration of generative AI, semantic retrieval, and recommendation-based capabilities to create more relevant, conversational help \u2014 partnering across engineering, data science, design, and content teams to define workflows, quality guardrails, and success metrics, ensuring solutions improved real customer outcomes rather than adding AI for novelty.',
    outcome:
      'A more intelligent, personalized self-service experience that increased targeted impressions by 8% and generated $1.9M in month-over-month revenue. The work drove a 25% increase in site traffic, improved end-of-year tax activity by 8% across product suites, reduced contact rate by 3%, and contributed to a 15% gain in operational efficiency \u2014 moving QuickBooks support from a static help model toward an adaptive, AI-assisted experience designed around the moments that matter.',
    skills: [
      'AI-powered product strategy',
      'Generative AI',
      'Personalized digital experiences',
      'Conversational support',
      'Recommendation systems',
      'Semantic search / retrieval',
      'Self-service optimization',
      'Customer journey design',
      'Product experimentation',
      'Cross-functional leadership',
      'Data-driven prioritization',
      'Operational efficiency',
    ],
    whyItMatters:
      'This demonstrates my ability to apply AI in a practical product context \u2014 not just as a feature, but as a way to improve user outcomes, customer efficiency, and business performance at scale. It shows I can lead complex, cross-functional initiatives where AI, data, UX, and measurable impact come together.',
  },
  {
    id: 'open-play-sports',
    index: '05',
    company: 'Open Play Sports',
    descriptor:
      'A founder-led discovery and registration-intelligence platform helping parents find youth sports programs across fragmented municipal, school, league, and club systems.',
    role: 'Owner / Product Lead',
    timeframe: 'Ongoing',
    headline: 'Building a Vendor-Neutral Discovery Layer for Youth Sports',
    problem:
      'Youth sports registration is highly fragmented across municipal recreation departments, school athletics sites, independent leagues, social media, PDFs, email lists, and word of mouth. Parents often don\u2019t know where to look, when registration opens, or which organizations serve their child\u2019s age or grade \u2014 creating unnecessary friction that can disadvantage families newer to a community or less connected to existing sports networks.',
    approach:
      'I designed Open Play Sports as a centralized discovery and registration-intelligence platform that helps parents find youth sports opportunities based on location, age, grade, season, and activity. Rather than building another league-management or registration system, I positioned Open Play as a vendor-neutral discovery layer that aggregates programs across municipal recreation systems, schools, clubs, and independent sports organizations. I defined the product strategy, MVP requirements, canonical activity data model, search and eligibility logic, notification model, and source-provenance framework \u2014 and designed an AI-assisted ingestion architecture that collects structured and unstructured information from sources such as MyRec, SportsEngine, WebTrac, CivicRec, and municipal websites, normalizes it into a common schema, and routes uncertain data through human review. The product is being built using an AI-assisted development workflow with a web-first architecture designed to support future mobile applications and shared platform services.',
    outcome:
      'Open Play Sports has progressed from problem discovery to a functioning web product with activity search, eligibility filtering, program detail pages, registration links, alerts, organization discovery, community submissions, and data-verification concepts. I established an initial Vermont source registry spanning municipal recreation departments, statewide sports associations, and independent youth organizations to support automated program discovery and future statewide coverage. The next phase is a Central Vermont pilot designed to validate program coverage, registration click-throughs, alert adoption, information accuracy, and whether families discover opportunities they otherwise would have missed.',
    skills: [
      'Product strategy',
      'Zero-to-one product development',
      'AI-assisted product development',
      'Agentic AI',
      'Platform architecture',
      'Marketplace strategy',
      'Product discovery',
      'Data modeling',
      'Structured & unstructured data ingestion',
      'AI human-in-the-loop workflows',
      'API design',
      'Search & matching',
      'Notification systems',
      'Web & mobile product strategy',
      'Product analytics',
      'MVP definition',
      'Go-to-market strategy',
      'Competitive analysis',
    ],
    whyItMatters:
      'Open Play demonstrates how I approach ambiguous, fragmented problems as a product leader: identify the underlying user problem, establish a differentiated product position, define a scalable platform architecture, and use AI where it creates operational leverage rather than adding unnecessary complexity. It also reflects my broader focus on building connected ecosystems \u2014 separating the consumer experience from underlying source systems to create a common data and services layer that can support web, mobile, organizations, municipalities, and AI agents without requiring every participant to use the same technology.',
    screenshot: {
      src: '/images/open-play-sports-screenshot.png',
      alt: 'Open Play Sports homepage showing youth sports search by sport, grade, and ZIP code, with programs closing soon',
    },
  },
]

export const experience = [
  {
    company: 'California Behavioral Health Transformation',
    role: 'Principal Product Manager, Consultant',
    timeframe: '2025 \u2013 Present',
    summary:
      'Lead product strategy across client management, patient consent, interoperability, and enterprise identity platforms for a statewide behavioral health transformation.',
  },
  {
    company: 'Arvest Bank',
    role: 'Principal Product Manager, Consultant \u2014 CIAM',
    timeframe: '2024 \u2013 2025',
    summary:
      'Led modernization initiatives across customer identity, authentication, and access workflows in a regulated banking environment.',
  },
  {
    company: 'Intuit',
    role: 'Senior Product Manager \u2014 QuickBooks Global Help & Support',
    timeframe: '2022 \u2013 2024',
    summary:
      'Owned the global self-service and conversational help platform, building AI-powered support and personalized experiences that scaled globally.',
  },
  {
    company: 'Capital One',
    role: 'Senior Product Manager \u2014 Enterprise Data & Security Platform',
    timeframe: '2010 \u2013 2022',
    summary:
      'Led enterprise data and developer platform initiatives, modernizing how data was discovered, accessed, governed, and reused across the organization.',
  },
]

export const philosophy = {
  tagline: 'Designing Trusted AI Ecosystems for Regulated Industries',
  narrative: [
    'My core strength is the ability to recognize the underlying structure that connects complex systems \u2014 and then turn that structure into a platform others can build upon. Where most people see fragmented tools, teams, and data, I see the shared model waiting to be defined.',
    'I design trusted ecosystems that allow many independent people, organizations, applications, and data sources to work together safely \u2014 bringing together identity, governance, knowledge graphs, agentic AI, and enterprise platforms to solve problems in healthcare, financial services, and other regulated industries.',
    'Leading this work means operating across product, engineering, policy, legal, and operations at once. I set strategy in ambiguous domains, align executive stakeholders on source-of-truth decisions, and mentor product teams to think in systems and own measurable outcomes \u2014 building both durable platforms and the leaders who extend them.',
  ],
  pillars: [
    {
      title: 'Structure into platform',
      description:
        'I find the canonical model beneath fragmented systems and turn it into reusable, governed capabilities \u2014 solving a problem once, well, and making it consumable across the enterprise.',
    },
    {
      title: 'Trust as architecture',
      description:
        'Identity, consent, authorization, and auditability are designed in from the start, so many independent parties can safely share data and workflows in regulated environments.',
    },
    {
      title: 'Agentic AI with guardrails',
      description:
        'I apply generative and agentic AI where it improves real outcomes \u2014 grounded in knowledge graphs, governed data, and quality guardrails rather than novelty.',
    },
    {
      title: 'Leadership across boundaries',
      description:
        'I align product, engineering, policy, legal, and operations on hard trade-offs, and grow product leaders who can hold ambiguity and set direction without me in the room.',
    },
  ],
}

export const credentials = {
  patent: {
    title: 'U.S. Patent US11809398B1',
    description:
      'Methods and systems for connecting data with non-standardized schemas in connected graph data exchange.',
  },
}
