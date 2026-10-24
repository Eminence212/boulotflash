type Tone = 'attente' | 'succes' | 'refus' | 'alerte' | 'soft';

const TONES: Record<string, Tone> = {
  SUBMITTED: 'attente',
  SHORTLISTED: 'attente',
  OFFERED: 'alerte',
  ACCEPTED: 'succes',
  REJECTED: 'refus',
};

/** Ce que le candidat doit comprendre de son statut, et ce qui se passe ensuite. */
const HINTS: Record<string, string> = {
  SUBMITTED:
    'Le recruteur examine les candidatures. Vous serez prévenu s’il vous retient.',
  SHORTLISTED:
    'Vous êtes présélectionné. Le recruteur peut vous proposer la mission.',
  OFFERED: 'Le recruteur vous propose une place. Répondez avant l’échéance.',
  ACCEPTED: 'Le recruteur est prévenu. Gardez la date et l’heure de la mission.',
  REJECTED: 'Le recruteur n’a pas retenu votre candidature.',
  DECLINED: 'Vous avez décliné la proposition.',
  WITHDRAWN:
    'Vous avez retiré votre candidature. Vous ne pouvez plus postuler à cette mission.',
  EXPIRED: 'Cette proposition a expiré.',
};

export function applicationTone(status: string): Tone {
  return TONES[status] ?? 'soft';
}

export function applicationHint(status: string): string | null {
  return HINTS[status] ?? null;
}

export function canWithdrawApplication(status: string): boolean {
  return status === 'SUBMITTED' || status === 'SHORTLISTED';
}
