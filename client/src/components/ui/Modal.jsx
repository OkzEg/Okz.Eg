export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-timber-900/50" onClick={onClose} />
      <div
        className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-timber-100 px-4 py-3.5 sm:px-6 sm:py-4">
          <h2 className="text-base font-semibold text-timber-900 sm:text-lg">{title}</h2>
          <button type="button" className="btn-ghost btn-sm shrink-0" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
