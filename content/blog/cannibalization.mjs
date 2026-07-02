/**
 * Cannibalized blog posts: removed slug → canonical slug (301 redirect target).
 * Keep the canonical article; remove the duplicate from POSTS at build time.
 */
export const CANNIBALIZED_REDIRECTS = {
  // Compliance — sweepstakes vs lottery
  'sweepstakes-vs-contests-vs-lotteries': 'sweepstakes-lottery-contest-difference',
  // How online sweepstakes work
  'online-sweepstakes-explained': 'how-online-sweepstakes-work-us',
  // Travel giveaways — year duplicate
  'best-legitimate-travel-giveaways-2025': 'best-legitimate-travel-giveaways-2026',
  // How to enter travel
  'how-to-enter-travel-sweepstakes-win': 'how-to-enter-travel-sweepstakes-and-win',
  'step-by-step-enter-win-travel-contest': 'how-to-enter-travel-sweepstakes-and-win',
  // Beginners vacation 101
  'vacation-sweepstakes-guide-beginners': 'vacation-sweepstakes-beginners-guide',
  // Fake vs real travel
  'how-to-spot-fake-travel-giveaway': 'spot-fake-travel-giveaway-vs-real',
  // Free flight + hotel
  'free-flight-hotel-giveaway-real': 'free-flight-and-hotel-giveaway-legit',
  // Best travel lists
  'best-travel-sweepstakes-today': 'best-legitimate-travel-giveaways-2026',
  // Win a vacation how-to
  'win-a-free-vacation-this-year': 'ultimate-guide-vacation-sweepstakes-us',
  // Are travel promos real
  'are-travel-contests-real': 'are-travel-giveaways-real-legit',
  // Beginner sweepstakes USA (overlap with Gaviom guide)
  'beginners-guide-sweepstakes-usa': 'gaviom-sweepstakes-guide-enter-win-online',
};

export const CANNIBALIZED_REMOVED = new Set(Object.keys(CANNIBALIZED_REDIRECTS));
