export default function EmptyState({ title, subtitle, action }) {
  return (
    <div className="text-center py-16 px-4">
      <h3 className="text-lg font-semibold text-timber-800">{title}</h3>
      {subtitle && <p className="text-sm text-timber-500 mt-2 max-w-md mx-auto">{subtitle}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
