export enum WordListCategory {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  SENIOR = 'Senior',
  MASTER = 'Master',
  CUSTOM = 'Custom'
}

export const INITIAL_WORD_LISTS: Record<string, string[]> = {
  [WordListCategory.BEGINNER]: [
    'Book', 'Help', 'Finger', 'Teacher', 'Potato', 'Play', 'Shoes', 'Sport', 'Night', 'Think',
    'Often', 'Water', 'Notebook', 'Country', 'Children', 'Look', 'Spoon', 'Near', 'Movie', 'Make',
    'Feel', 'Face', 'Between', 'Nature', 'Father', 'Boy', 'Flower', 'Monday', 'Sneakers', 'Always',
    'Tree', 'Bottle', 'Speak', 'Small', 'Bored', 'Person', 'Gate', 'Please', 'Computer', 'Close',
    'Strong', 'Pencil', 'Friend', 'People', 'Answer', 'Rich', 'Wash', 'School', 'Break', 'Activity'
  ],
  [WordListCategory.INTERMEDIATE]: [
    'Accurate', 'Adventure', 'Balance', 'Calendar', 'Career', 'Challenge', 'Complete', 'Control', 'Curious', 'Decide',
    'Discover', 'Energy', 'Famous', 'Focus', 'Gather', 'Honest', 'Imagine', 'Improve', 'Journey', 'Knowledge',
    'Language', 'Member', 'Message', 'Notice', 'Observe', 'Outside', 'Package', 'Patient', 'Perfect', 'Popular',
    'Practice', 'Prepare', 'Present', 'Protect', 'Provide', 'Quickly', 'Reason', 'Respect', 'Result', 'Secret',
    'Serious', 'Special', 'Student', 'Suggest', 'Talent', 'Travel', 'Useful', 'Vacation', 'Welcome', 'Yesterday'
  ],
  [WordListCategory.SENIOR]: [
    'Astonishing', 'Ambiguous', 'Anxious', 'Apprehensive', 'Articulate', 'Assertive', 'Assimilate', 'Autonomous', 'Benevolent', 'Brevity',
    'Capricious', 'Camouflage', 'Coherence', 'Colloquial', 'Conscientious', 'Controversial', 'Convoluted', 'Divulge', 'Dilemma', 'Discrepancy',
    'Eloquent', 'Empirical', 'Enigmatic', 'Ephemeral', 'Encounter', 'Foster', 'Fairness', 'Filmmaker', 'Hypothetical', 'Impeccable',
    'Importune', 'Indispensable', 'Ineffable', 'Judgemental', 'Meticulous', 'Neighborhood', 'Obsolete', 'Paradox', 'Perseverance', 'Plausible',
    'Pragmatic', 'Predicament', 'Redundant', 'Reiterate', 'Resilient', 'Sophisticated', 'Spontaneous', 'Subtle', 'Unnecessary', 'Taxonomy',
    'Wisdom', 'Chiaroscurist'
  ],
  [WordListCategory.MASTER]: [
    'Acknowledgment', 'Acquaintance', 'Architecture', 'Biochemistry', 'Compliance', 'Camouflage', 'Conscientious', 'Controversial', 'Dehydration', 'Disappearance',
    'Embarrassing', 'Environmentally', 'Exaggeration', 'Flabbergasted', 'Handkerchief', 'Hypothetical', 'Independence', 'Irreplaceable', 'Knowledgeable', 'Misunderstood',
    'Overwhelming', 'Psychologist', 'Quarantine', 'Recommendable', 'Unbelievable'
  ]
};

// Common British to US spelling mappings for warnings
export const SPELLING_VARIANTS: Record<string, string> = {
  'colour': 'color',
  'flavour': 'flavor',
  'honour': 'honor',
  'humour': 'humor',
  'labour': 'labor',
  'neighbour': 'neighbor',
  'centre': 'center',
  'fibre': 'fiber',
  'litre': 'liter',
  'theatre': 'theater',
  'travelling': 'traveling',
  'cancelled': 'canceled',
  'defence': 'defense',
  'licence': 'license',
  'offence': 'offense',
  'apologise': 'apologize',
  'organise': 'organize',
  'recognise': 'recognize',
  'acknowledgement': 'acknowledgment',
  'judgment': 'judgement', // In some contexts, but let's stick to list
};
