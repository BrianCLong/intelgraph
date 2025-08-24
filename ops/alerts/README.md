# Alerts Ops

Provider credentials are loaded from secrets at runtime. Set the following env vars:

- `ALERTS_EMAIL_API_KEY`
- `ALERTS_SLACK_WEBHOOK`
- `ALERTS_WEBHOOK_SECRET`

Templates live in `templates/` and support localization. Copy `templates/default.en.json` and translate as needed.
