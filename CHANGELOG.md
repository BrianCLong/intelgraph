# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Unreleased

- fix: standardize GraphQL linting configuration

## [1.0.0] - 2025-08-18

### Added

- GA release with signed artifacts and SOC2 Type I readiness.
- Nightly CVE scan and post-GA patch workflows.
- Link to detailed notes: [RELEASE_NOTES_1.0.0.md](docs/releases/RELEASE_NOTES_1.0.0.md).

### Changed

- Integrated outstanding branches for the 1.0.0 cut.

### Deprecated

- Legacy 0.x installers.

### Fixed

- Corrected residency misconfiguration in GA values file.

### Security

- Images are signed and attested with SLSA provenance and CycloneDX SBOM.

---

## History

```
61498e5fa0ba1c7984d9c5e52c96513275886cd9 - IntelGraph Developer, 19 minutes ago : MVP
0a06c8d39679d4a2f59fe4acbcdedf98d49af295 - IntelGraph Developer, 32 minutes ago : mvp
f50c459504b2b0cf91793c41f6543e3fd35bdca1 - IntelGraph Developer, 32 minutes ago : mvp
afd44be0ffb5b420ce832a1b965f492fe4fd65fc - IntelGraph Developer, 32 minutes ago : mvp
ef6669635b0f58fc64555d83b0042541185b428b - IntelGraph Developer, 2 hours ago : mvp
e96b8d1a93f019f7eac40a4bd1ba4305a45365f7 - IntelGraph Developer, 2 hours ago : Merge branch 'codex/ensure-mvp3-is-fully-functional'
dd489458f684cd1504150a11621d833c1f6e3089 - IntelGraph Developer, 3 hours ago : mvp
16fd7439d3e2b664b1b4daa8a524ecf459bf5d83 - IntelGraph Developer, 3 hours ago : mvp
19b926038de44b936db9fb5e535e85d1edcbf97d - BrianCLong, 6 hours ago : docs: add velocity plans v4-v6 (#300)
917f492b7272113e5431f7260b85113387181d33 - BrianCLong, 6 hours ago : docs: add velocity plans v4-v6 (#301)
1d7c9343046fcdbd4fa905fc1c9e455616c886dd - BrianCLong, 6 hours ago : feat: record web vitals and resolver metrics (#319)
6cd57631eb6a82508ee3494bfc52f7def09dcf75 - BrianCLong, 6 hours ago : chore(ci): block gitleaks and add pre-commit hook (#320)
1473866418d1fe7b31bc057119c949040fb5098d - BrianCLong, 6 hours ago : fix: handle redis failure in analytics bridge (#321)
9f228c110fc1d55957e9868fe2ae4e0fda17de0b - BrianCLong, 6 hours ago : feat: add node classifier and close issues (#322)
106f5ce95496c61cb1e99f7c1782767e2dd2d574 - BrianCLong, 6 hours ago : feat: add deletion helpers for Neo4j store (#323)
50f08a61d285e6628715440409068113876314ba - IntelGraph Developer, 6 hours ago : feat(sprint6): Complete AI Insight Enrichment implementation
df93f2c2cdfd7c9b6f64dd6bb2cf315ccdb41f8c - IntelGraph Developer, 9 hours ago : mvp
85477cef0ceedca43b58b2f8ddc7d4b74123f041 - IntelGraph Developer, 19 hours ago : mvp
40fabcfbb1badbc9f987686d50a8695f0762e208 - IntelGraph Developer, 21 hours ago : MVP
f9685583fd4d75dbd1c41cc9fbc12270e8ccbda6 - BrianCLong, 21 hours ago : feat: track neo4j resource metrics (#274)
1968a41d9fca46e9d45e5e78bf789a4ab8c155d9 - BrianCLong, 21 hours ago : fix: correct audit logging on entity view (#277)
81dc9c660a153b3ad17428e33e01165af3e905f9 - BrianCLong, 21 hours ago : docs: expand threat assessment engine (#281)
cae950666cabd9679af60a1926e69bd07cfdcc8a - BrianCLong, 21 hours ago : docs: add Splunk integration enhancements (#282)
b0e0aaa4234af5f8a8c6d6ce972ef045aa2b006c - BrianCLong, 21 hours ago : feat: add transformative feature placeholders (#283)
c839965689448a59ad088794aa3cbd9c32a3d6ec - BrianCLong, 21 hours ago : feat(graphrag): add schema validation metrics (#285)
4dbbce9603d3a8390abd3ef2563ae8cc76994bf6 - BrianCLong, 21 hours ago : docs: expand OSINT source catalog (#286)
e182027719d435f1a8a36a7a2b57d37a7e6cd2d4 - BrianCLong, 21 hours ago : ci: verify full stack deployment builds and starts (#287)
111cfa4e40ba22df6baedebcf704d3e56dd71cef - BrianCLong, 21 hours ago : feat: add osint feed service (#288)
340e263aef54c0c8a7820b914a4525a91a716bcd - BrianCLong, 21 hours ago : feat(graphql): wire graphrag and similarity resolvers (#290)
2f61db3ed9fde692392a18797cf1378f230899a5 - BrianCLong, 21 hours ago : chore: add ESLint v9 flat config (#291)
5f583fcd98247a68ea89f526382d3c8765a0c990 - BrianCLong, 21 hours ago : feat: add timescaledb service (#292)
81ae97d92148cc3e1d5aef2656ba5210603d095f - BrianCLong, 21 hours ago : ci: add PR velocity automation tooling (#293)
7d679f1956f2fe4a8759b4d6dbb26d469942f63d - BrianCLong, 21 hours ago : feat: add basic audio and image entity extraction tasks (#295)
ace65cdce86f2d60fe48339d6d9ee544b5396daa - BrianCLong, 21 hours ago : fix: ensure redis auth and update health checks (#296)
ec5b7ab12f39086f06047c1f26d4e0e23a564ee3 - BrianCLong, 21 hours ago : docs: add velocity plans for upcoming sprints (#289)
06bf8524382a323dbad77f1f894e4dc5568042f9 - BrianCLong, 21 hours ago : docs: add forward-looking TDE feature issues (#294)
7ddb0c9fd000dc4aa43c2e3706b8f52f24a11d51 - IntelGraph Developer, 23 hours ago : MVP
8007fc868360d7934b40a0d873d86ffec5890819 - IntelGraph Developer, 25 hours ago : MVP
2f534c95bb8dd96863defdafb1664ed57cb20fc2 - IntelGraph Developer, 25 hours ago : MVP
b4a2847353a31686b6546813696efbb64f8c5804 - IntelGraph Developer, 27 hours ago : mvp
4fde5c55759d2d15fa0a5323626c6542b9831694 - IntelGraph Developer, 27 hours ago : MVP
d12441dc18be8249a20f81a2ed328b5b3665c17a - BrianCLong, 28 hours ago : feat: add AI task manager and team role configuration (#284)
a7147ad955bee507fce41f58dfed0f6a686a3073 - IntelGraph Developer, 28 hours ago : mvp
3ea75b369e3273d056930cd61a59d98d67d52a4b - IntelGraph Developer, 29 hours ago : mvp
26a81de1fec76f06bad1ba5609846a1e86e783e6 - IntelGraph Developer, 31 hours ago : mvp
26c75d5d982c4599ff21aa7490536977514ea2fa - IntelGraph Developer, 31 hours ago : Merge branch 'main' of https://github.com/BrianCLong/intelgraph
000d020436cc0e55ea4d8820e8072cec385d8e74 - IntelGraph Developer, 31 hours ago : mvp
8861635406b6c275b06b4c08619e58018caa64ca - IntelGraph Developer, 31 hours ago : MVP
2da1482d1a152a3a7edee21f95d6452688a5ec74 - dependabot[bot], 31 hours ago : chore(deps-dev): bump lint-staged from 13.3.0 to 16.1.5 (#118)
f8cc411da6aa24102ba1c2dc11a8e4542ff365e2 - dependabot[bot], 31 hours ago : chore(deps): bump @apollo/server from 4.12.2 to 5.0.0 in /server (#263)
075028bea4165315d5e435172e6933d2c087c85b - BrianCLong, 31 hours ago : chore: record mvp0 project board (#275)
7a108c10d26bb327e38c972d52ecb9e92d47b156 - BrianCLong, 31 hours ago : feat(server): log ML failures and update job status (#278)
85c7c51628fad6b7243d19c2dceabacd7f468e1b - BrianCLong, 31 hours ago : feat: add CISA KEV ingestion pipeline and source inventory (#279)
5a621e49f07218f6b3d673d890ec5a3526cc0595 - BrianCLong, 31 hours ago : docs: add GEOINT spatiotemporal AI blueprint [geo][temporal][rag][predictive] (#280)
b0dc38413144340cda7cb9c0477854821591dae7 - dependabot[bot], 31 hours ago : chore(deps): bump @mui/material from 5.18.0 to 7.3.1 in /client (#262)
e5cff582e23b4adc7ee918b6bf54625bc1fe99a9 - dependabot[bot], 31 hours ago : chore(deps-dev): bump eslint-plugin-react-hooks in /client (#264)
93498b491bd6b0743aaec26f907c77dadf512027 - dependabot[bot], 31 hours ago : chore(deps-dev): bump eslint from 8.57.1 to 9.33.0 in /server (#265)
c7af868e0f83323b203089016f1d7e6d30923c67 - dependabot[bot], 31 hours ago : chore(deps): bump react-redux from 8.1.3 to 9.2.0 in /client (#266)
dc49cddfdc86ac67d64be707013e44afc1afcce9 - dependabot[bot], 31 hours ago : chore(deps): bump @reduxjs/toolkit from 1.9.7 to 2.8.2 in /client (#268)
2ba5ba1a2d7eea47b19952e73d5de4fe19912865 - dependabot[bot], 31 hours ago : chore(deps): bump @bull-board/api from 5.23.0 to 6.12.0 in /server (#267)
6ccab166cbb6cef3cbd09e7182b899250bc83e39 - dependabot[bot], 31 hours ago : chore(deps): bump dotenv from 16.6.1 to 17.2.1 in /server (#269)
f6373354644b2b2974d312dfe949c4da0e0a9481 - dependabot[bot], 31 hours ago : chore(deps): bump date-fns from 2.30.0 to 4.1.0 in /client (#270)
470b728dcea5be3e807f97fcbdf4f6c44ae23ab0 - IntelGraph Developer, 31 hours ago : feat: implement PR burn-down and DevEx acceleration infrastructure
329d4dc07ef7b1fcf071316f143b9d438fa41b6b - dependabot[bot], 31 hours ago : chore(deps): bump bullmq from 4.18.3 to 5.57.0 in /server (#271)
37db1a6785c20c8712b06d64d107f427306781e6 - IntelGraph Developer, 31 hours ago : mvp
b63ce8581492788027f451582a806cbc706eb524 - BrianCLong, 32 hours ago : fix: clean up test placeholders and config
41e3d29364358c26dc8a04efb75f7d4990eaea3b - IntelGraph Developer, 32 hours ago : mvp
7b05ae1ae9dacab3533db3955250ed1222e3d293 - IntelGraph Developer, 32 hours ago : MVP
0aa97cfa3e55e879ffaf19e507b6fdf50e624d12 - IntelGraph Developer, 32 hours ago : feat: Comprehensive AI/ML Pipeline Integration
12cf32145911e8ccd3b95aab4dde36f30d1d7c6c - IntelGraph Developer, 33 hours ago : Delete commit_message.txt
94b4e7b267a2919d2d41162d49c7d3cb3c9fc4dc - IntelGraph Developer, 33 hours ago : Create commit_message.txt
6ea722a0689b734bf3cf03faecacdd97ab0c54f6 - IntelGraph Developer, 33 hours ago : mvp
043a791d9800601613c55a550ff4ef8402a8435b - IntelGraph Developer, 33 hours ago : feat: Add 5 new high-priority GitHub issue templates
d3cd7ed2ee7e755d6654e793b503420e51566764 - IntelGraph Developer, 2 days ago : MVP
47b835211fc0012eb68c5560d7eee83bd11345b6 - IntelGraph Developer, 2 days ago : mvp
c1e310ec5e669e9a9b1ef3fe9147d2ab7d946adf - IntelGraph Developer, 2 days ago : mvp
d4a053eedc90748ccf31a53c8111c521d41445c3 - IntelGraph Developer, 2 days ago : mvp
d3cb40b0cd45d221b5f0c758cf43d204a37fdd1a - IntelGraph Developer, 2 days ago : mvp
8a94b32cc2bb13531c4966f2acf0788323181868 - IntelGraph Developer, 2 days ago : mvp
e0d13f3e4b5f11a7e5066ce46708c43c96453d73 - IntelGraph Developer, 2 days ago : mvp
3b8bf7a60a0204f76c2cde62e1cfcb3694a978fc - IntelGraph Developer, 2 days ago : mvp
add256474a3f313e35b1ec62f861315d24ee463d - IntelGraph Developer, 2 days ago : MVP
8f7cd7b5fb2b5907bb4b7fef9aaacbcd66e47645 - IntelGraph Developer, 2 days ago : Path
709e616b4e7d9da73e73b5ff0ac2174abdb36906 - IntelGraph Developer, 2 days ago : data
3623245d0f67610cd90d42c2b9e26ac7f2cd60c5 - IntelGraph Developer, 2 days ago : data
da2a1216575c69827a328c02b2eac6229edd9206 - IntelGraph Developer, 2 days ago : data
3f7491de13feab46266d4bebcb5abf3d91798149 - IntelGraph Developer, 2 days ago : data
8e0f25bf4262860d9e042d31623e6b3bcfc9057f - IntelGraph Developer, 2 days ago : Data
41b1930fa642288d7500568d1416d916da6b311c - IntelGraph Developer, 2 days ago : cicd
886ffb813482ddb3d04e7b2f5854eb9587b538a9 - IntelGraph Developer, 2 days ago : data
01c2f136ae69b227d6dcf37872205e18afaca0cc - IntelGraph Developer, 2 days ago : fixes
1079985044ef394307a6816e8d42285caa1b0a89 - IntelGraph Developer, 2 days ago : fix
b341047cd9bbddd348b27c97ecd91cc6fb417445 - IntelGraph Developer, 2 days ago : fixes
131a34035adb145b925f1f733b733b360ecb6be7 - IntelGraph Developer, 2 days ago : gnn
3b27fa76ece2269898e33c01662079022713c2d0 - IntelGraph Developer, 2 days ago : feat(embeddings): add backfill script and pgvector dimension adjuster

- Scripts: backfill_embeddings.js (partitionable by investigationId/since), adjust_pgvector_dimension.js
- Server worker enhanced to filter by investigation/since
- Docs: usage examples for setup, adjust, and backfill
718a07886800f1e3e77a2e4891ea6c96accda586 - IntelGraph Developer, 2 days ago : gnn
8e580180ad869b50413d0f8454f6add144cbe81b - IntelGraph Developer, 3 days ago : feat(ai): enable GraphQL WS subscriptions, add GNN webhook, hybrid search, and embedding worker

- Client: AI Suggestions tab streams via graphql-ws; search panel with hybrid toggle
- Server: graphql-ws (ws) support, aiSuggestions subscription, Redis cache + GNN background enqueue, webhook endpoints
- ML: GNN task posts results to server webhook with API key support
- Embeddings: background worker writes pgvector entity_embeddings with investigation/since filters
- DB: pgvector setup script and SQL
8e7c17ebd297a597471ef7309d836979a2aa2007 - IntelGraph Developer, 3 days ago : Update analyticsBridge.js
e07d4b5299440bd96cd90bbd1731abb34b9fd56d - IntelGraph Developer, 3 days ago : Visualization
bc56813664e5f2128fc1598c0b29f20f7c2d940e - IntelGraph Developer, 3 days ago : Update resolvers.graphops.js
ee309dd978b4cbf185e0d729bbf495647cede643 - IntelGraph Developer, 3 days ago : ok
398032a78b06f8cc97fed7743463ba85a88acf1f - IntelGraph Developer, 3 days ago : gnn
9c94dbee976d0a416579b28eaa052c9df090a438 - IntelGraph Developer, 3 days ago : gnn
090b1b7a969d65940ce141ef989fae2e5653a4cd - IntelGraph Developer, 3 days ago : feat(ui/graph): success snackbar on AI request; persist camera per-investigation id via route param; add /graph/advanced/:id route; add Seed Demo button behind VITE_SEED_BUTTON flag; guard dev feature routes
8d4aec6f910e21e19d9e1917d3501c23f5ef3055 - IntelGraph Developer, 3 days ago : Update analyticsBridge.int.test.js
e46ebfa9f7db80cdf3d4a538dab5f92ca5af3281 - IntelGraph Developer, 3 days ago : Update CHANGELOG.md
bfaa2c04c0775986d1ca64f957a16c3eef89abb4 - IntelGraph Developer, 3 days ago : gnn
152331d303eb4362e3868fadbcd91b35fe465bd6 - IntelGraph Developer, 3 days ago : feat(e2e,ui): guard dev routes with DEV_FEATURE_ROUTES flag; persist AI panel state; optional seed graph via VITE_SEED_ADV_GRAPH; add GraphQL relationship query; success snackbars; E2E matrix and auth header support
702461911ffc7d6ff939ecbf8198e3349c9e9157 - IntelGraph Developer, 3 days ago : test(e2e): enable Playwright E2E in CI; add dev-only /dev/ai-insight and /dev/relationship endpoints; persist AI panel + camera; expose cy for tests; edge inspector fetches server metadata
04f815471e8ee68540824ef8f7ab0f7c9834bcc2 - IntelGraph Developer, 3 days ago : feat(ui/graph): edge inspector dialog wired to selection/context menu; persist layout/LOD/sprite prefs in localStorage; optional sprite label overlay; snackbar errors for mutations; add skipped E2E skeleton
06b363b0a5d0290b386af4d2e52fd4b30cccf042 - IntelGraph Developer, 3 days ago : feat(ui/graph): add keyboard UX (Space pan, Esc deselect), chunked element additions, throttled hover tooltip, layout selector; Apollo expandNeighbors → cy add via event; socket auth token
582cd37b9fe0872daecbfaebf67b3e4131285b7b - IntelGraph Developer, 3 days ago : feat(ui): add AdvancedGraphView with LOD rendering, context menu, and live AI insights panel; add graphInteraction slice, GraphQL ops, and socket wiring; docs for interactions; route at /graph/advanced
9bfa182a39648c3816ec56e1bb33edba0e19ba6a - IntelGraph Developer, 3 days ago : commit
07ceae8f4deacc5772e167ecc17503fc1e19b53a - IntelGraph Developer, 3 days ago : gnn
199819d958b66704b770f134d124e4705c3c5535 - IntelGraph Developer, 3 days ago : gnn
24cc466e5f76fb7adfabc26f85e2ecf849fdd183 - IntelGraph Developer, 3 days ago : Create AIInsightsPanel.test.jsx
c0a7a6cccf8ae11d6b011d570977f7df577de30f - IntelGraph Developer, 3 days ago : GNN
4ca1f7b453e7427f5c4f818593c1a60d6ed491ad - IntelGraph Developer, 3 days ago : Update jest.config.js
371d83cf23b7fc88960bf2ce107547dc06c56a02 - IntelGraph Developer, 3 days ago : gnn
ef69d551597c8029bed6d0c3cd528769919176e9 - IntelGraph Developer, 3 days ago : GNN
e5578e3788bef9574149d7a8c97dc5cb0f0a37af - IntelGraph Developer, 3 days ago : Issues
759b787887c22180cf4a564bd45e8a484b0fcf3d - IntelGraph Developer, 3 days ago : roadmap: expand v0.2.0/v0.3.0 scope with AI, collab, monitoring, devops; add helper to set PROJECT_URL; extend label set; sync backlog to issues
fa55b5635c4f75f05c5ae613017c02ab019274f3 - IntelGraph Developer, 3 days ago : Update package-lock.json
936629780008a143201be560e59c50210332baeb - IntelGraph Developer, 3 days ago : ci(projects,smoke): auto-add issues/PRs to GitHub Project via var PROJECT_URL; add docker-compose smoke test; add resolver unit tests; harden DB indexes
0063ccbaa9a73dca3e73fb2be35311f6584d804b - IntelGraph Developer, 3 days ago : ops(issues): harden bootstrap flow; add Node-based CSV parser; normalize assignees to OWNER; auto-create due:* labels
883974b6993c4f963c753fddc5f5254f8a7751b9 - IntelGraph Developer, 3 days ago : db(schema): extend Postgres baseline (users, roles, entities, relationships, audit_events); add Neo4j constraints; add health test with lightweight app factory
9a9c0012b4625d3ca4b631b0096967805c4f0ec - IntelGraph Developer, 3 days ago : ci(docs): add markdownlint + commitlint workflow
64e0482970d2e95ab1b62b8625bc6be1bfa95b45 - IntelGraph Developer, 3 days ago : fix(security): disable x-powered-by and add strict referrer policy via helmet
6329c082c374204293af83216227498b57c8de3a - IntelGraph Developer, 3 days ago : chore(ci): add GitHub bootstrap/update scripts for labels, milestones, and issues
e26e122e70e7b91de456b976c9cbd60bfe3fa6d4 - IntelGraph Developer, 3 days ago : docs: add AGENTS.md contributor guide tailored to repo
c8b891dd385989fb2fd0ab64a0bbb727108774df - IntelGraph Developer, 3 days ago : chore(docs): remove intelgraph-docs-bundle after integration; content moved under docs/, .github/, and db/
c47f88c25a68fcc1e7073d329949215b03ff13bb - IntelGraph Developer, 3 days ago : chore(docs,ci,db): apply docs bundle; add markdownlint/commitlint; add migrations+seeds with runnable scripts; add PR template; add GitHub bootstrap scripts
98a9fac75930894ae61d70c5fae36ec578495bce - IntelGraph Developer, 3 days ago : deploy
3ee0273a3286c1d897c9a949cab75debb259045a - IntelGraph Developer, 3 days ago : deploy
7aff527852e1ef38bbf5a8b3f04941d59d9fb268 - IntelGraph Developer, 3 days ago : deploy
3042f8e1a1788e062de97d1e380059593a989c4f - IntelGraph Developer, 3 days ago : Deploy
86d11012ebd36878dcc50b514761d5c356548f05 - IntelGraph Developer, 3 days ago : feat: complete production deployment package for enterprise environments
3fc0a8e04286e85aa097979eb01f0ed02900aeee - IntelGraph Developer, 3 days ago : fix: resolve production startup issues and enable full system functionality
742ae45dd6f052c3f927ce2ace78af45690f0d26 - IntelGraph Developer, 3 days ago : commit
b7aaa552c6862f6175ba0c7579890d0e63caddde - IntelGraph Developer, 3 days ago : release notes
9da3f284efaa1d5c9493b2ca10e9d23d3e3d499c - IntelGraph Developer, 3 days ago : chore: final tidy pass and stabilize tests (sandbox)
53ba9f31e338a3eb09ece6329ceab0574108a1a9 - IntelGraph Developer, 3 days ago : test: stabilize services (security, analytics, simulation); feat: ws notifications; fix: layouts; chore: constructor flexibility
d9fd02ddc2b62aa95e47d9819c1bcdf5a436ba3a - IntelGraph Developer, 3 days ago : mvp
54b4bc79803cd61c0e546f4f46a57a0945174257 - IntelGraph Developer, 3 days ago : Merge feature/ai-ml-service into main
4b32087c929e150574e492feed4d94e2b4e32395 - IntelGraph Developer, 3 days ago : Merge branch 'chore/dev-boost-apply' into main
065543bbfad66d9ea8e6160814dc793bdb43678a - IntelGraph Developer, 3 days ago : commit
497e6d15607af42d615813c8ba8b892c9fbdf2a5 - IntelGraph Developer, 3 days ago : mvp
0bd30c4f40be6423d09b6a52e3b52dfe9b7a2069 - IntelGraph Developer, 3 days ago : feat(geoint): convex hull overlays and optional heat layer (plugin if available) with fallback; selection filter
f84c5042977f3c84775dde2420bcef485ea2f718 - IntelGraph Developer, 3 days ago : feat(client): Vision analysis panel; GEOINT map page with heat and basic cluster overlays; API bindings for /api/vision and /api/geoint; routes and menu entries
3cdc78ac2d37ca304313ba1a9579da9de28e0a5a - BrianCLong, 3 days ago : Server health endpoints, client version, CODEOWNERS (#158)
8bf26ee8d35efcc4fd4e461216984720237bb0f0 - IntelGraph Developer, 3 days ago : mvp
274456afc38269e5a7699d7474ae51b72627c23f - IntelGraph Developer, 4 days ago : MVP
759333b8390d7b61260d98e81cb084d7415762b4 - IntelGraph Developer, 4 days ago : commit
399a85ed7aadbef2dee196f0fd9075ba31fcc491 - IntelGraph Developer, 4 days ago : commit
de82082b476d0833cd14f29b2b6f5f3d363abba8 - IntelGraph Developer, 4 days ago : Commit
6cbee8869dddee2f934cc65f5482648157269521 - IntelGraph Developer, 4 days ago : COMMIT
3a15eb996d3c0b32d48111c1bd733700823cf8ca - IntelGraph Developer, 4 days ago : commit
f026e2e0a9074a72216aed9923e6e9a2ebd93ba1 - IntelGraph Developer, 4 days ago : Commit
4dd9e95c34820c3810d7df7f257c988d47e60a8f - IntelGraph Developer, 4 days ago : commit
ecadef318a40eafa35f81f87820e3947cf44f043 - dependabot[bot], 4 days ago : chore(deps-dev): bump concurrently from 8.2.2 to 9.2.0
f4fd91763c469f63daf17424b496ba03fdf34194 - IntelGraph Developer, 4 days ago : Commit
8a73d4c9a75e68cf73258604b129e1e8dacbac7b - IntelGraph Developer, 4 days ago : commit
721c84d7938720a3e5e41d3e9648520a39118333 - IntelGraph Developer, 4 days ago : MVP1
19758a172cc7833e1abd33726aa0afcfd82217c4 - IntelGraph Developer, 4 days ago : Cytoscape
6e18fbda1abeea5157459ed2409ad0da29d4afe8 - IntelGraph Developer, 4 days ago : feat: complete IntelGraph platform implementation
c8bebfd90461a94d55846739a27b1cfd6e1f249f - IntelGraph Developer, 4 days ago : Merge remote-tracking branch 'origin/main' into feature/ai-ml-service
b834b6811aa3b2e256348879b01290e50575e222 - IntelGraph Developer, 4 days ago : AIML
a7b452e164afd6b3f2be6c3ba7c420e376360fdc - IntelGraph Developer, 4 days ago : Boost
cfda3a2552efb1ebbf29e9579b6889b9b91aa5e7 - IntelGraph Developer, 4 days ago : Boost
52a13c281000de004dad5b40753124c18cd879f1 - BrianCLong, 4 days ago : Create main.jsx
459062c0f32d939385fde7c3fa1233dc24488caf - BrianCLong, 4 days ago : Create database.js
b2b6ec47d1f838adf21399e198908a6545b44c8a - BrianCLong, 4 days ago : Create AuthService.js
42a95fc4b8ebc18d0dabcccddf6f70f46b1fe9ac - IntelGraph Developer, 4 days ago : feat: complete IntelGraph platform implementation
c4ebe7bf041ee695bbda69f4bc3774793b7ca104 - IntelGraph Developer, 4 days ago : feat: initial IntelGraph platform implementation
```
