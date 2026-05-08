interface Props {
  label: string;
  amount: number;
  icon: string;
  color: 'green' | 'red' | 'blue';
}

const scheme = {
  green: { card: 'bg-green-50  border-green-300',  label: 'text-green-700', amount: 'text-green-700', icon: 'bg-green-100' },
  red:   { card: 'bg-red-50    border-red-300',    label: 'text-red-700',   amount: 'text-red-700',   icon: 'bg-red-100'   },
  blue:  { card: 'bg-blue-50   border-blue-300',   label: 'text-blue-700',  amount: 'text-blue-700',  icon: 'bg-blue-100'  },
};

export default function SummaryCard({ label, amount, icon, color }: Props) {
  const s = scheme[color];
  return (
    <div className={`rounded-2xl border-2 p-5 ${s.card}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-11 h-11 flex items-center justify-center rounded-xl text-2xl ${s.icon}`}>{icon}</span>
        <span className={`text-base font-semibold ${s.label}`}>{label}</span>
      </div>
      <p className={`text-3xl font-extrabold tracking-tight ${s.amount}`}>
        ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </p>
      <p className={`text-sm font-medium mt-0.5 opacity-60 ${s.label}`}>บาท</p>
    </div>
  );
}
