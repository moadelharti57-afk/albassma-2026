/**
 * Everything specific to this year's event lives here.
 * Edit these values: the landing page reads them all.
 *
 * ⚠️ Items marked "À REMPLACER" are placeholders I could not know.
 */

export const EVENT = {
  name: 'Albassma Film',
  edition: 'Édition 2026',
  year: 2026,
  club: 'Mohandiss Al Bassma',
  tagline: "Une nuit de cinéma, de culture et de communauté.",

  // Exact start time in ISO format, with the Moroccan offset.
  // Set to null to show "Date bientôt annoncée" and hide the countdown.
  date: null as string | null, // À REMPLACER, ex: '2026-12-19T18:00:00+01:00'
  dateLabel: 'Date bientôt annoncée', // À REMPLACER, ex: 'Samedi 19 décembre · 18h00'
  venue: 'Lieu bientôt annoncé', // À REMPLACER, ex: 'Amphithéâtre principal, ENSA'
  city: 'Maroc', // À REMPLACER

  contactEmail: '', // optional, shown in the footer if set
  instagram: '', // optional, full URL
};

/** Numbers from last year's edition. À REMPLACER with the real figures. */
export const LAST_EDITION_STATS: { value: number; suffix?: string; label: string }[] = [
  { value: 300, suffix: '+', label: 'Spectateurs' },
  { value: 1, label: 'Grande projection' },
  { value: 10, label: 'Membres du club mobilisés' },
  { value: 100, suffix: '%', label: 'Billets numériques' },
];

/** The evening's programme. À REMPLACER with the real schedule. */
export const PROGRAMME: { time: string; title: string; text: string }[] = [
  { time: '17:30', title: 'Ouverture des portes', text: 'Accueil, scan de votre billet QR et installation dans la salle.' },
  { time: '18:00', title: 'Mot d’ouverture', text: 'Le club Mohandiss Al Bassma présente l’édition 2026.' },
  { time: '18:20', title: 'Projection', text: 'Le film de la soirée, sur grand écran.' },
  { time: '20:15', title: 'Débat & échanges', text: 'Discussion autour du film avec le public.' },
  { time: '21:00', title: 'Clôture', text: 'Photos, rencontres et fin de soirée.' },
];

export const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Comment je m’inscris ?',
    answer: "L'inscription se fait en ligne en quelques secondes. Vous recevez votre billet numérique immédiatement après.",
  },
  {
    question: 'Comment je reçois mon billet ?',
    answer: 'Un PDF avec votre QR code se télécharge tout de suite, et une copie est envoyée par email.',
  },
  {
    question: "Que dois-je présenter à l'entrée ?",
    answer: "Le QR code de votre billet, sur votre téléphone ou imprimé. L'équipe le scanne en une seconde.",
  },
  {
    question: 'Puis-je inscrire un ami ?',
    answer: 'Oui. Chaque personne a besoin de son propre billet : remplissez le formulaire une fois par personne.',
  },
  {
    question: 'Mon billet peut-il être utilisé deux fois ?',
    answer: 'Non. Chaque billet est valable pour une seule entrée : une fois scanné, il est marqué comme utilisé.',
  },
];
