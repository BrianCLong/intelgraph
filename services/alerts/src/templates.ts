const templates: Record<string, Record<string, string>> = {
  en: {
    default: 'Alert: {{message}}'
  },
  es: {
    default: 'Alerta: {{message}}'
  }
};

export function renderTemplate(locale: string, key: string, data: Record<string, string>): string {
  const tpl = templates[locale]?.[key] ?? templates.en[key];
  return tpl.replace(/{{(\w+)}}/g, (_, k) => data[k] ?? '');
}

export default templates;
