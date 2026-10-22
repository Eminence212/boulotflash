/**
 * Retire le bandeau méta (tableau + citation technique) pour n’afficher
 * que le texte juridique lisible.
 */
export function prepareLegalMarkdown(raw: string): string {
  let text = raw.replace(/\r\n/g, '\n').trim();

  // Titre H1 en double avec le Title de page
  text = text.replace(/^#\s+[^\n]+\n+/, '');

  // Tableau méta en tête (| ... |)
  text = text.replace(/^(?:\|[^\n]*\n)+\n?/, '');

  // Blockquote technique sous le tableau
  text = text.replace(/^>\s*[^\n]+(?:\n>\s*[^\n]+)*\n+/, '');

  // Règle horizontale initiale
  text = text.replace(/^---\n+/, '');

  // Liens internes docs → pages app (libellé lisible)
  text = text
    .replace(
      /\[POLITIQUE_CONFIDENTIALITE\.md\]\(\.?\.?\/?POLITIQUE_CONFIDENTIALITE\.md\)/g,
      '[Politique de confidentialité](/confidentialite)',
    )
    .replace(
      /\[CONDITIONS_UTILISATION\.md\]\(\.?\.?\/?CONDITIONS_UTILISATION\.md\)/g,
      '[Conditions d’utilisation](/conditions)',
    )
    .replace(/\[CDC\.md\]\(\.\.\/CDC\.md[^)]*\)/g, '[cahier des charges](#)')
    .replace(/\]\(\.\.\/[^)]+\)/g, '](#)');

  return text.trim();
}
