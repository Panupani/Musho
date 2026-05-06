interface Props {
  label: string;
  amount: number;
  icon: string;
  color: 'green' | 'red' | 'blue';
}

const colors = {
  green: 'bg-green-50 border-green-200 text-green-700',
  red:   'bg-red-50 border-red-200 text-red-700',
  blue:  'bg-blue-50 border-blue-200 text-blue-700',
};

const amountColors = {
  green: 'text-green-600',
  red:   'text-red-600',
  blue:  'text-blue-600',
};

export default function SummaryCard({ label, amount, icon, color }: Props) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-medium opacity-75">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${amountColors[color]}`}>
        ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}
