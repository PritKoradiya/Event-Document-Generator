import { useNavigate, Link } from "react-router-dom";
import posterData from "../data/posterData.js";
import templateData from "../data/templateData.js";

const categories = [
  { name: "Seminar", badge: "S", explanation: "Academic sessions, guest lectures, and knowledge sharing programs.", example: "Cyber Security Awareness Seminar" },
  { name: "Conference", badge: "C", explanation: "Multi-session events, paper presentations, and professional meets.", example: "International Research Conference" },
  { name: "FDP", badge: "F", explanation: "Faculty development programs and professional training sessions.", example: "AI Tools for Teaching FDP" },
  { name: "Expert Talk", badge: "E", explanation: "Invited expert sessions by industry or academic speakers.", example: "Cloud Computing Expert Talk" },
  { name: "Workshop", badge: "W", explanation: "Hands-on learning sessions, labs, and practical skill events.", example: "React Basics Workshop" },
  { name: "Webinar", badge: "O", explanation: "Online events, virtual talks, and remote learning sessions.", example: "Career Guidance Webinar" },
  { name: "Hackathon", badge: "H", explanation: "Coding sprints, innovation challenges, and prototype building.", example: "Smart City Hackathon" },
  { name: "Training", badge: "T", explanation: "Internship, training, and course completion certificates.", example: "Full Stack Development Training" },
  { name: "Competition", badge: "K", explanation: "Coding contests, project challenges, and competitive events.", example: "Intercollege Coding Competition" },
  { name: "Appreciation", badge: "A", explanation: "Recognition for contribution, support, and volunteer service.", example: "Volunteer Appreciation Drive" },
  { name: "Academic", badge: "D", explanation: "Achievement, excellence, and academic recognition certificates.", example: "Academic Excellence Award" },
  { name: "Cultural", badge: "U", explanation: "Cultural programs, performances, and creative events.", example: "Annual Cultural Fest" },
  { name: "Sports", badge: "P", explanation: "Sports days, tournaments, and athletic achievements.", example: "Interdepartment Cricket Tournament" },
  { name: "Technical", badge: "X", explanation: "Technical festivals, demos, exhibitions, and club events.", example: "Project Exhibition Day" }
];

function Categories() {
  const navigate = useNavigate();
  const stats = [
    { label: "14 Event Categories", icon: "🗂️" },
    { label: `${templateData.length} Templates`, icon: "🎨" },
    { label: `${posterData.length} Poster Layouts`, icon: "📄" },
    { label: "Vector PDF Export", icon: "⚡" }
  ];

  const countTemplatesByCategory = (categoryName) => {
    return templateData.filter((template) => template.category === categoryName).length;
  };

  const countPostersByCategory = (categoryName) => {
    return posterData.filter((poster) => poster.category === categoryName).length;
  };

  const handleExploreTemplates = (categoryName) => {
    localStorage.setItem("selectedTemplateCategory", categoryName);
    navigate("/templates");
  };

  return (
    <section className="space-y-8 pb-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Link to="/certificate-dashboard" className="hover:text-blue-600 transition">
          Certificate Studio
        </Link>
        <span>/</span>
        <span className="text-slate-800">Categories</span>
      </nav>

      {/* Page Hero */}
      <div className="app-glass-hero p-7 lg:p-9 animate-hero-fade-in">
        <span className="text-xs font-black uppercase tracking-widest text-blue-600">
          EVENT CATEGORIES
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-sans">
          Certificate Categories
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600 font-medium leading-relaxed">
          Organize and filter certificate designs by event domain such as seminars, workshops, FDPs, hackathons, and conferences.
        </p>

        {/* Quick Stats Bar */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="app-glass-panel p-3.5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-lg">
                {item.icon}
              </span>
              <span className="text-sm font-black text-slate-900">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const templateCount = countTemplatesByCategory(cat.name);
          const posterCount = countPostersByCategory(cat.name);

          return (
            <div
              key={cat.name}
              className="group app-glass-card p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                    {cat.badge}
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                    {templateCount} Templates
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-black text-slate-950 font-sans tracking-tight">
                  {cat.name}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 font-medium">
                  {cat.explanation}
                </p>

                <div className="mt-4 rounded-xl bg-slate-50/80 p-3 text-xs space-y-1 border border-slate-100">
                  <p className="text-slate-700">
                    <span className="font-extrabold text-slate-900">Example:</span> {cat.example}
                  </p>
                  <p className="text-slate-500">
                    <span className="font-bold">Posters available:</span> {posterCount}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleExploreTemplates(cat.name)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-50 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-600 hover:text-white transition active:scale-98"
                >
                  <span>Explore Templates</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Categories;
