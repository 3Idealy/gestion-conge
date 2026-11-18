import { Link } from 'react-router-dom';

/* ── Card ──────────────────────────────────────────────────────────── */
export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`glass rounded-[var(--radius-xl)] shadow-sm transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`px-6 py-5 border-b border-[var(--color-border)]/40 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={`text-lg font-bold tracking-tight text-[var(--color-text)] ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }) {
  return <p className={`text-sm mt-1 text-[var(--color-text-secondary)] font-medium ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}

/* ── Button ────────────────────────────────────────────────────────── */
const buttonVariants = {
  primary: `bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-md shadow-[var(--color-primary)]/15 border-transparent`,
  outline: `bg-transparent text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-bg-muted)] hover:border-[var(--color-text-muted)]`,
  ghost: `bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] border-transparent`,
  danger: `bg-[var(--color-danger)] text-white hover:bg-[#b91c1c] shadow-md shadow-[var(--color-danger)]/15 border-transparent`,
  success: `bg-[var(--color-success)] text-white hover:bg-[#047857] shadow-md shadow-[var(--color-success)]/15 border-transparent`,
  secondary: `bg-[var(--color-secondary)] text-white hover:opacity-90 shadow-md shadow-[var(--color-secondary)]/15 border-transparent`,
};

const buttonSizes = {
  xs: 'px-2.5 py-1 text-xs rounded-[var(--radius)]',
  sm: 'px-3 py-1.5 text-xs rounded-[var(--radius)]',
  md: 'px-4 py-2.5 text-sm rounded-[var(--radius-lg)]',
  lg: 'px-6 py-3 text-base rounded-[var(--radius-lg)]',
};

export function Button({ children, variant = 'primary', size = 'md', className = '', disabled = false, loading = false, ...props }) {
  const v = buttonVariants[variant] || buttonVariants.primary;
  const s = buttonSizes[size] || buttonSizes.md;

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 border focus-ring
        ${disabled || loading ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:-translate-y-px active:scale-[0.97] active:translate-y-0'}
        ${s} ${v} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}

/* ── Input ──────────────────────────────────────────────────────────── */
export function Input({ label, error, className = '', id, ...props }) {
  return (
    <div className="space-y-1.5 group">
      {label && (
        <label htmlFor={id} className={`block text-sm font-semibold transition-colors duration-200 ${error ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)] group-focus-within:text-[var(--color-primary)]'}`}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          className={`w-full px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-medium transition-all duration-300 outline-none
            bg-[var(--color-bg-input)] shadow-sm focus-ring
            ${error ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20 focus:border-[var(--color-danger)]' : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]'}
            border hover:border-[var(--color-text-muted)] ${className}`}
          style={{ color: 'var(--color-text)' }}
          {...props}
        />
      </div>
      {error && <p className="text-xs font-medium text-[var(--color-danger)] animate-fade-in">{error}</p>}
    </div>
  );
}

/* ── Textarea ──────────────────────────────────────────────────────── */
export function Textarea({ label, error, className = '', id, rows = 3, ...props }) {
  return (
    <div className="space-y-1.5 group">
      {label && (
        <label htmlFor={id} className={`block text-sm font-semibold transition-colors duration-200 ${error ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)] group-focus-within:text-[var(--color-primary)]'}`}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        className={`w-full px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-medium transition-all duration-300 outline-none resize-y
          bg-[var(--color-bg-input)] shadow-sm focus-ring
          ${error ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20 focus:border-[var(--color-danger)]' : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]'}
          border hover:border-[var(--color-text-muted)] ${className}`}
        style={{ color: 'var(--color-text)' }}
        {...props}
      />
      {error && <p className="text-xs font-medium text-[var(--color-danger)] animate-fade-in">{error}</p>}
    </div>
  );
}

/* ── Select ─────────────────────────────────────────────────────────── */
export function Select({ label, options = [], error, className = '', id, placeholder = 'Sélectionner...', ...props }) {
  return (
    <div className="space-y-1.5 group">
      {label && (
        <label htmlFor={id} className={`block text-sm font-semibold transition-colors duration-200 ${error ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)] group-focus-within:text-[var(--color-primary)]'}`}>
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-medium transition-all duration-300 outline-none cursor-pointer appearance-none
          bg-[var(--color-bg-input)] shadow-sm focus-ring
          ${error ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20 focus:border-[var(--color-danger)]' : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]'}
          border hover:border-[var(--color-text-muted)] ${className}`}
        style={{ color: 'var(--color-text)', backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
        {...props}
      >
        <option value="" disabled className="text-gray-400">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs font-medium text-[var(--color-danger)] animate-fade-in">{error}</p>}
    </div>
  );
}

/* ── Table ──────────────────────────────────────────────────────────── */
export function Table({ children, className = '' }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]/80 shadow-sm bg-white">
      <table className={`w-full text-sm text-left ${className}`}>{children}</table>
    </div>
  );
}

export function TableHeader({ children }) {
  return <thead className="bg-[var(--color-bg-muted)]/80 backdrop-blur-md sticky top-0 z-10 border-b border-[var(--color-border)]">{children}</thead>;
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-[var(--color-border)]/50">{children}</tbody>;
}

export function TableRow({ children, className = '', ...props }) {
  return (
    <tr className={`transition-all duration-200 hover:bg-[var(--color-primary-light)]/20 group ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '' }) {
  return (
    <th className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] ${className}`}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '' }) {
  return <td className={`px-5 py-3.5 text-[var(--color-text)] font-medium ${className}`}>{children}</td>;
}

/* ── Modal / Dialog ────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, description, children, size = 'md' }) {
  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
      <div
        className={`relative w-full ${sizes[size]} glass-strong rounded-[var(--radius-xl)] shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto border border-white/20`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="px-8 py-6 border-b border-[var(--color-border)]/40">
            {title && <h2 className="text-xl font-bold text-[var(--color-text)] tracking-tight">{title}</h2>}
            {description && <p className="text-sm mt-1.5 text-[var(--color-text-secondary)] font-medium">{description}</p>}
          </div>
        )}
        <div className="px-8 py-6">{children}</div>
      </div>
    </div>
  );
}

/* ── Badge ──────────────────────────────────────────────────────────── */
const badgeColors = {
  primary: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary)]/15',
  success: 'bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]/15',
  warning: 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[var(--color-warning)]/15',
  danger: 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border-[var(--color-danger)]/15',
  info: 'bg-[var(--color-info-light)] text-[var(--color-info)] border-[var(--color-info)]/15',
  default: 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
  secondary: 'bg-[var(--color-secondary-light)] text-[var(--color-secondary)] border-[var(--color-secondary)]/15',
};

export function Badge({ children, variant = 'default', className = '', dot = false }) {
  const c = badgeColors[variant] || badgeColors.default;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${c} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
      {children}
    </span>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────── */
export function Skeleton({ className = '', width, height }) {
  return (
    <div
      className={`rounded-xl relative overflow-hidden bg-slate-200/40 ${className}`}
      style={{ width, height }}
    >
       <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  );
}

/* ── Empty State ───────────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-muted)] flex items-center justify-center mb-5 shadow-sm border border-[var(--color-border)]/50">
        {Icon && <Icon className="w-8 h-8 text-[var(--color-text-muted)]" />}
      </div>
      <h3 className="text-xl font-bold text-[var(--color-text)] mb-2 tracking-tight">{title}</h3>
      {description && <p className="text-sm font-medium text-[var(--color-text-secondary)] max-w-sm mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

/* ── Confirm Dialog ────────────────────────────────────────────────── */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', variant = 'danger', loading = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={message} size="sm">
      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]/40 mt-2">
        <Button variant="ghost" onClick={onClose} disabled={loading}>Annuler</Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

/* ── Stat Card ─────────────────────────────────────────────────────── */
export function StatCard({ title, value, icon: Icon, trend, trendLabel, color = 'primary', loading = false, className = '' }) {
  const colors = {
    primary: { gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-100', text: 'text-emerald-600', glow: 'shadow-emerald-200' },
    success: { gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-100', text: 'text-green-600', glow: 'shadow-green-200' },
    warning: { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-100', text: 'text-amber-600', glow: 'shadow-amber-200' },
    info: { gradient: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-100', text: 'text-cyan-600', glow: 'shadow-cyan-200' },
    danger: { gradient: 'from-red-500 to-rose-500', bg: 'bg-red-100', text: 'text-red-600', glow: 'shadow-red-200' },
    secondary: { gradient: 'from-teal-500 to-cyan-500', bg: 'bg-teal-100', text: 'text-teal-600', glow: 'shadow-teal-200' },
  };
  const c = colors[color] || colors.primary;

  return (
    <Card className={`relative overflow-hidden group card-hover ${className}`}>
      {/* Background decorative gradient */}
      <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full blur-2xl opacity-30 bg-gradient-to-br ${c.gradient} transition-all duration-500 group-hover:scale-150 group-hover:opacity-50`} />
      
      <CardContent className="py-5 relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider">{title}</p>
            {loading ? (
              <Skeleton height="32px" width="60px" className="rounded-md mt-1" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">{value}</p>
                {trendLabel && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${trend >= 0 ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'}`}>
                    {trend >= 0 ? '↑' : '↓'} {trendLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${c.bg} ${c.glow} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
            {Icon && <Icon className={`w-6 h-6 ${c.text}`} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Page Header ───────────────────────────────────────────────────── */
export function PageHeader({ title, description, icon: Icon, actions, className = '' }) {
  return (
    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 animate-fade-in ${className}`}>
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200 flex-shrink-0">
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[var(--color-text)]">{title}</h1>
          {description && <p className="text-sm mt-1 text-[var(--color-text-secondary)] font-medium">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

/* ── Search Input ──────────────────────────────────────────────────── */
export function SearchInput({ value, onChange, placeholder = 'Rechercher...', className = '' }) {
  return (
    <div className={`relative group ${className}`}>
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--color-border)] bg-white focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all outline-none"
      />
    </div>
  );
}
