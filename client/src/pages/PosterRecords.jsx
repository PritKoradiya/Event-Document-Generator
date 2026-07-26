import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import PosterPreview from "../components/PosterPreview.jsx";
import { getPosters, deletePoster } from "../services/posterApi.js";
import { downloadPosterPng, downloadPosterPdf } from "../utils/downloadPoster.js";
import StatusPill from "../components/ui/StatusPill.jsx";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

function PosterRecords() {
  const [posters, setPosters] = useState([]);
  const [selectedPoster, setSelectedPoster] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const posterSvgRef = useRef(null);

  const fetchPosterRecords = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const result = await getPosters();
      const list = result.data || [];
      setPosters(list);

      if (selectedPoster) {
        const updated = list.find((p) => (p._id || p.id) === (selectedPoster._id || selectedPoster.id));
        setSelectedPoster(updated || list[0] || null);
      } else if (list.length > 0) {
        setSelectedPoster(list[0]);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message || "Failed to fetch poster records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosterRecords();
  }, []);

  const handleView = (poster) => {
    setSelectedPoster(poster);
    const viewEl = document.getElementById("poster-record-view");
    if (viewEl) {
      viewEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this poster record?")) {
      return;
    }

    try {
      await deletePoster(id);
      alert("Poster record deleted successfully.");
      if (selectedPoster && (selectedPoster._id === id || selectedPoster.id === id)) {
        setSelectedPoster(null);
      }
      fetchPosterRecords();
    } catch (error) {
      alert(error.message || "Failed to delete poster.");
    }
  };

  const handleDownloadPng = (poster) => {
    setSelectedPoster(poster);
    setTimeout(() => {
      const fileName = `Poster_${poster.posterTitle}_${poster.posterId || "POSTER-2026-0001"}.png`;
      downloadPosterPng(posterSvgRef.current, fileName);
    }, 150);
  };

  const handleDownloadPdf = (poster) => {
    setSelectedPoster(poster);
    setTimeout(() => {
      const fileName = `Poster_${poster.posterTitle}_${poster.posterId || "POSTER-2026-0001"}.pdf`;
      downloadPosterPdf(posterSvgRef.current, fileName);
    }, 150);
  };

  const filteredPosters = posters.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      p.posterTitle?.toLowerCase().includes(query) ||
      p.organizerName?.toLowerCase().includes(query) ||
      (p.posterId || "").toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "All" || p.status?.toLowerCase() === statusFilter.toLowerCase();

    const matchesCategory =
      categoryFilter === "All" || p.category?.toLowerCase() === categoryFilter.toLowerCase();

    return matchesQuery && matchesStatus && matchesCategory;
  });

  return (
    <section className="space-y-8 pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Link to="/certificate-dashboard" className="hover:text-blue-600 transition">
          Certificate Studio
        </Link>
        <span>/</span>
        <span className="text-slate-800">Poster Records</span>
      </nav>

      {/* Page Hero */}
      <div className="rounded-3xl border border-blue-100/80 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 p-7 shadow-xs lg:p-9 animate-hero-fade-in">
        <span className="text-xs font-black uppercase tracking-widest text-blue-600">
          DESIGN REPOSITORY
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-sans">
          Poster Records
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600 font-medium leading-relaxed">
          Manage saved event posters. Search by event title or poster ID, view live documents, or export PNG and A4 PDF files.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button
            onClick={fetchPosterRecords}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="app-glass-toolbar p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            placeholder="Search by title, organizer, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={inputClass}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputClass}
          >
            <option value="All">Status: All</option>
            <option value="Generated">Generated</option>
            <option value="Draft">Draft</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={inputClass}
          >
            <option value="All">Category: All</option>
            <option value="Seminar">Seminar</option>
            <option value="Conference">Conference</option>
            <option value="FDP">FDP</option>
            <option value="Expert Talk">Expert Talk</option>
            <option value="Workshop">Workshop</option>
            <option value="Webinar">Webinar</option>
            <option value="Hackathon">Hackathon</option>
            <option value="Cultural">Cultural</option>
            <option value="Sports">Sports</option>
            <option value="Technical">Technical</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500 px-1">
          <span>Showing {filteredPosters.length} of {posters.length} poster records</span>
          {(searchQuery || statusFilter !== "All" || categoryFilter !== "All") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("All");
                setCategoryFilter("All");
              }}
              className="text-blue-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Records Table / List */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <p className="text-xs font-bold text-slate-500">Fetching poster records...</p>
          </div>
        </div>
      ) : posters.length === 0 ? (
        <div className="app-glass-surface p-12 text-center shadow-xs">
          <span className="text-4xl block mb-3">🎨</span>
          <h3 className="text-xl font-black text-slate-950 font-sans">No poster records found.</h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Create your first event poster using our template builder.
          </p>
          <Link
            to="/create-poster"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 transition"
          >
            <span>Create Poster</span>
            <span>→</span>
          </Link>
        </div>
      ) : (
        <div className="app-glass-table overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-4">Poster Title</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Event Date</th>
                  <th className="py-4 px-4">Template</th>
                  <th className="py-4 px-4">Poster ID</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPosters.map((poster) => {
                  const isSelected = selectedPoster && (selectedPoster._id || selectedPoster.id) === (poster._id || poster.id);
                  return (
                    <tr
                      key={poster._id || poster.id}
                      className={`hover:bg-blue-50/30 transition ${
                        isSelected ? "bg-blue-50/50 font-semibold" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-950 min-w-[180px]">
                        {poster.posterTitle}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                        {poster.category}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                        {poster.eventDate}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {poster.templateStyle}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                        {poster.posterId || "N/A"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusPill status={poster.status || "Generated"} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleView(poster)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            }`}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDownloadPng(poster)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          >
                            PNG
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(poster)}
                            className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => handleDelete(poster._id || poster.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Poster View Canvas */}
      {selectedPoster && (
        <section id="poster-record-view" className="rounded-3xl border border-slate-200/90 bg-slate-100/70 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-600">Active Document View</span>
              <h3 className="text-xl font-black text-slate-950 font-sans">{selectedPoster.posterTitle}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadPng(selectedPoster)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 transition shadow-xs"
              >
                Download PNG
              </button>
              <button
                onClick={() => handleDownloadPdf(selectedPoster)}
                className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white hover:bg-purple-700 transition shadow-xs"
              >
                Download A4 PDF
              </button>
            </div>
          </div>

          <div className="w-full flex justify-center overflow-x-auto py-2">
            <PosterPreview
              ref={posterSvgRef}
              id="poster-preview-record-svg"
              posterTitle={selectedPoster.posterTitle}
              tagline={selectedPoster.tagline}
              category={selectedPoster.category}
              eventDate={selectedPoster.eventDate}
              eventTime={selectedPoster.eventTime}
              venue={selectedPoster.venue}
              speakerName={selectedPoster.speakerName}
              speakerDesignation={selectedPoster.speakerDesignation}
              organizerName={selectedPoster.organizerName}
              description={selectedPoster.description}
              contactInformation={selectedPoster.contactInformation}
              registrationText={selectedPoster.registrationText}
              templateStyle={selectedPoster.templateStyle}
              designKey={selectedPoster.designKey}
              posterImage={selectedPoster.posterImage}
              organizationLogo={selectedPoster.organizationLogo}
              posterId={selectedPoster.posterId}
            />
          </div>
        </section>
      )}
    </section>
  );
}

export default PosterRecords;
