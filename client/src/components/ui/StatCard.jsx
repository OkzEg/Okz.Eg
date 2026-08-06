export default function StatCard({ title, value, icon: Icon, tone = 'wheat' }) {
  const tones = {
    wheat: 'bg-wheat-100 text-wheat-500',
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tones[tone] || tones.wheat}`}>
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <div>
        <p className="text-sm text-timber-500">{title}</p>
        <p className="text-2xl font-bold text-timber-900 mt-1">{value}</p>
      </div>
    </div>
  );
}
