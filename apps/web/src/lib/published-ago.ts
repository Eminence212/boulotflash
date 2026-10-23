/** Temps écoulé depuis la publication : secondes, minutes, heures, jours. */
export function formatPublishedAgo(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  if (sec < 1) return 'à l’instant';
  if (sec < 60) {
    return sec === 1 ? 'il y a 1 seconde' : `il y a ${sec} secondes`;
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return min === 1 ? 'il y a 1 minute' : `il y a ${min} minutes`;
  }
  const hours = Math.floor(min / 60);
  if (hours < 24) {
    return hours === 1 ? 'il y a 1 heure' : `il y a ${hours} heures`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? 'il y a 1 jour' : `il y a ${days} jours`;
}

export function detailViewLabel(count: number): string {
  if (count <= 0) return 'Aucune vue du détail';
  if (count === 1) return '1 vue du détail';
  return `${count} vues du détail`;
}
