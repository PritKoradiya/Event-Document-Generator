const formatIssueDate = (createdAt) => {
  const issueDate = createdAt ? new Date(createdAt) : new Date();

  return issueDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const valueOrFallback = (value, fallback) => {
  const trimmedValue = typeof value === "string" ? value.trim() : value;

  return trimmedValue || fallback;
};

const themeStyles = {
  dark: {
    main: "text-slate-900",
    muted: "text-slate-600",
    accent: "text-blue-700",
    badge: "border-blue-100 bg-blue-50/90 text-blue-700",
    line: "bg-blue-700",
    footerLine: "border-slate-300",
    seal: "border-blue-600 bg-white/85 text-blue-700"
  },
  light: {
    main: "text-white",
    muted: "text-slate-200",
    accent: "text-yellow-300",
    badge: "border-white/20 bg-black/25 text-white",
    line: "bg-yellow-300",
    footerLine: "border-white/35",
    seal: "border-yellow-300 bg-black/20 text-yellow-200"
  },
  gold: {
    main: "text-yellow-100",
    muted: "text-slate-200",
    accent: "text-yellow-300",
    badge: "border-yellow-300/30 bg-black/25 text-yellow-100",
    line: "bg-yellow-300",
    footerLine: "border-yellow-300/45",
    seal: "border-yellow-300 bg-yellow-300/10 text-yellow-200"
  }
};

function CertificateTextOverlay({
  participantName,
  organizationName,
  eventName,
  category,
  certificateCategory,
  certificateTitle,
  eventDate,
  description,
  certificateId,
  authorizedSignatureName,
  createdAt,
  textTheme = "dark"
}) {
  const theme = themeStyles[textTheme] || themeStyles.dark;
  const displayParticipantName = valueOrFallback(participantName, "Participant Name");
  const displayOrganizationName = valueOrFallback(organizationName, "Organization Name");
  const displayEventName = valueOrFallback(eventName, "Event Name");
  const displayCategory = valueOrFallback(certificateCategory || category, "");
  const displayTitle = valueOrFallback(certificateTitle, "Certificate of Participation");
  const displayEventDate = valueOrFallback(eventDate, "Event Date");
  const displayDescription = valueOrFallback(description, "For successfully participating in the event.");
  const displaySignature = valueOrFallback(authorizedSignatureName, "");
  const issueDate = formatIssueDate(createdAt);

  return (
    <div className="certificate-text-overlay pointer-events-none absolute inset-0 z-20 text-center">
      {displayCategory && (
        <p
          className={`certificate-body-safe absolute truncate font-black uppercase tracking-[0.28em] ${theme.muted}`}
          style={{ top: "12%", left: "11%", right: "11%" }}
        >
          {displayCategory.toUpperCase()}
        </p>
      )}

      <h1
        className={`certificate-title-safe absolute font-serif ${theme.main}`}
        style={{ top: "18%", left: "10%", right: "10%" }}
      >
        {displayTitle}
      </h1>

      <p
        className={`certificate-body-safe absolute truncate font-bold uppercase tracking-[0.2em] ${theme.muted}`}
        style={{ top: "31%", left: "10%", right: "10%" }}
      >
        This certificate is proudly presented to
      </p>

      <h2
        className={`certificate-name-safe absolute font-serif ${theme.accent}`}
        style={{ top: "39%", left: "11%", right: "11%" }}
      >
        {displayParticipantName}
      </h2>

      <p
        className={`certificate-body-safe absolute break-words font-semibold ${theme.main}`}
        style={{ top: "51%", left: "11%", right: "11%" }}
      >
        From <span className="font-black">{displayOrganizationName}</span>
      </p>

      <p
        className={`certificate-body-safe absolute break-words font-semibold ${theme.main}`}
        style={{ top: "56%", left: "11%", right: "11%" }}
      >
        For successfully participating in <span className="font-black">{displayEventName}</span>
      </p>

      <div className="absolute flex justify-center" style={{ top: "61%", left: "10%", right: "10%" }}>
        <p className={`certificate-body-safe rounded-full border px-4 py-1 font-black ${theme.badge}`}>
          Event Date: {displayEventDate}
        </p>
      </div>

      <p
        className={`certificate-description-safe absolute break-words font-semibold ${theme.muted}`}
        style={{ top: "68%", left: "15%", right: "15%" }}
      >
        {displayDescription}
      </p>

      {displaySignature && (
        <footer
          className={`certificate-footer-safe absolute bottom-[7%] left-[11%] right-[11%] flex items-center justify-between border-t pt-4 ${theme.footerLine} ${theme.main}`}
        >
          <div className="min-w-0 text-left">
            <div className={`h-px w-full max-w-44 ${theme.line}`} />
            <p className={`mt-1.5 truncate font-black uppercase tracking-wide ${theme.main}`}>
              {displaySignature}
            </p>
            <p className={`mt-0.5 truncate text-xs font-semibold ${theme.muted}`}>
              Authorized Signature
            </p>
          </div>

          <div className="min-w-0 text-right">
            <p className={`mt-0.5 truncate text-[11px] font-semibold ${theme.muted}`}>Issue Date: {issueDate}</p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default CertificateTextOverlay;
