const defaultSafeArea = {
  paddingX: "13%",
  paddingY: "8%"
};

const backgroundTemplateData = [
  {
    id: "ppsu",
    name: "PPSU Certificate",
    category: "Academic",
    description: "Official PPSU School of Engineering certificate design",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/PPSU.png",
    textTheme: "dark",
    badgeClass: "bg-blue-100 text-blue-900"
  },
  {
    id: "p-p-savani-university",
    name: "P P Savani University Certificate",
    category: "Academic",
    description: "Official P P Savani University certificate design",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/P P Savani University.png",
    textTheme: "dark",
    badgeClass: "bg-blue-100 text-blue-900"
  },
  {
    id: "bg-template-1",
    name: "Royal Blue Border Certificate",
    category: "Academic",
    description: "Elegant blue border certificate background.",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/1.png",
    textTheme: "dark",
    badgeClass: "bg-blue-100 text-blue-900"
  },
  {
    id: "bg-template-2",
    name: "Modern Teal Gold Certificate",
    category: "Conference",
    description: "Modern teal and gold certificate background.",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/2.png",
    textTheme: "dark",
    badgeClass: "bg-teal-100 text-teal-800"
  },
  {
    id: "bg-template-3",
    name: "Silver Premium Certificate",
    category: "Appreciation",
    description: "Premium silver certificate background for formal recognition.",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/3.png",
    textTheme: "dark",
    badgeClass: "bg-slate-100 text-slate-700"
  },
  {
    id: "bg-template-4",
    name: "Gold Corner Achievement Certificate",
    category: "Competition",
    description: "Achievement certificate background with gold corner styling.",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/4.png",
    textTheme: "dark",
    badgeClass: "bg-amber-100 text-amber-800"
  },
  {
    id: "bg-template-5",
    name: "Light Blue Ornate Certificate",
    category: "Seminar",
    description: "Light blue ornate certificate background for academic events.",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/5.png",
    textTheme: "dark",
    badgeClass: "bg-sky-100 text-sky-800"
  },
  {
    id: "bg-template-6",
    name: "Dark Gold Luxury Certificate",
    category: "Appreciation",
    description: "Dark luxury background with gold accents.",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/6.png",
    textTheme: "light",
    badgeClass: "bg-slate-900 text-amber-200"
  },
  {
    id: "bg-template-7",
    name: "Creative Color Certificate",
    category: "Cultural",
    description: "Creative colorful certificate background for events and programs.",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/7.png",
    textTheme: "dark",
    badgeClass: "bg-orange-100 text-orange-800"
  },
  {
    id: "bg-template-8",
    name: "Student Award Certificate",
    category: "Competition",
    description: "Student-friendly award certificate background.",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/8.png",
    textTheme: "dark",
    badgeClass: "bg-yellow-100 text-yellow-800"
  },
  {
    id: "bg-template-9",
    name: "Blue Corporate Certificate",
    category: "Training",
    description: "Professional blue corporate certificate background.",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/9.png",
    textTheme: "dark",
    badgeClass: "bg-blue-100 text-blue-800"
  },
  {
    id: "bg-template-10",
    name: "Minimal Classic Certificate",
    category: "Workshop",
    description: "Minimal classic certificate background for clean certificates.",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/10.png",
    textTheme: "dark",
    badgeClass: "bg-stone-100 text-stone-800"
  },
  {
    id: "bg-template-11",
    name: "Elegant Border Certificate",
    category: "Expert Talk",
    description: "Elegant border certificate background for formal sessions.",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/11.png",
    textTheme: "dark",
    badgeClass: "bg-indigo-100 text-indigo-800"
  },
  {
    id: "bg-template-12",
    name: "Formal Academic Certificate",
    category: "Academic",
    description: "Formal academic certificate background for universities and colleges.",
    type: "certificate",
    designType: "image-background",
    backgroundImage: "/certificate-backgrounds/12.png",
    textTheme: "dark",
    badgeClass: "bg-blue-100 text-blue-900"
  }
].map((template) => ({
  ...template,
  safeArea: defaultSafeArea
}));

export default backgroundTemplateData;
