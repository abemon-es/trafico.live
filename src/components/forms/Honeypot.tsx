/**
 * A field people never see or reach: off-screen, out of the tab order and
 * hidden from assistive technology. The server (src/lib/form-guards.ts)
 * answers a filled one like a success and does nothing with it.
 */

interface HoneypotProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Honeypot({ value, onChange }: HoneypotProps) {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
      <label>
        Web
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
