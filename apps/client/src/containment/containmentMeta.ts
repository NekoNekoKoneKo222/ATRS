export interface StatusMeta {
  label: string;
  color: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  contained: { label: "収容中", color: "var(--aa-signal-teal)" },
  unstable: { label: "不安定", color: "var(--aa-signal-amber)" },
  breached: { label: "BREACH", color: "var(--aa-signal-rose)" },
  released: { label: "解放済み", color: "var(--aa-text-dim)" },
};

export function getContainmentStatusMeta(status: string): StatusMeta {
  return STATUS_META[status] ?? { label: status, color: "var(--aa-text-dim)" };
}
