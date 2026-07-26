function EmptyState({
  title = "No items found",
  description = "No records or items match your criteria.",
  icon = "📂",
  action
}) {
  return (
    <div className="app-glass-surface flex flex-col items-center justify-center p-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 text-3xl mb-4 shadow-sm border border-slate-200/60">
        {icon}
      </span>
      <h3 className="text-xl font-black text-slate-950 font-sans tracking-tight">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-600">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default EmptyState;
