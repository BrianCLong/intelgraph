# GA-Reports Architecture

The GA-Reports vertical slice introduces reporting and briefing capabilities into the IntelGraph platform. The service chain is composed of the following tiers:

```
[Sources] -> [Widgets] -> [Dashboards] -> [Reports]
          \                              /
           +------> [Schedules] --------+
```

* **Sources** – Saved queries (GraphQL, SQL, or Cypher) executed against internal IntelGraph services.
* **Widgets** – Renderers (charts, tables, KPIs, maps, or text) that transform source data into visual artifacts stored in object storage.
* **Dashboards** – Grid layouts arranging widgets for live monitoring. Dashboards may be exported to PDF or HTML.
* **Reports** – Narrative storyboards composed of chapters and blocks. Rendering supports PDF, HTML, and PPTX with classification banners and watermarks.
* **Schedules** – APScheduler jobs that trigger dashboard or report renders and log deliveries to the outbox.

The design emphasizes provenance and reproducibility. Every render generates a signed manifest linking the artifacts back to their data sources and templates.
