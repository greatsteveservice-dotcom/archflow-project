"use client";

export default function Loading({ text = "Загрузка..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-20 animate-fade-in">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-line border-t-ink rounded-full animate-spin mb-3" />
        <div className="text-sm text-ink-faint">{text}</div>
      </div>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20 animate-fade-in">
      <div className="bg-err-bg border border-err/20 rounded-xl px-6 py-4 max-w-md">
        <div className="text-sm text-err font-medium mb-1">Ошибка</div>
        <div className="text-sm text-ink-muted">{message}</div>
      </div>
    </div>
  );
}
