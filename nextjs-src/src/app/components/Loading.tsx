"use client";

export default function Loading({ text = "Загрузка..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-20 animate-fade-in">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-[#E8E6E1] border-t-[#2C5F2D] rounded-full animate-spin mb-3" />
        <div className="text-sm text-[#9B9B9B]">{text}</div>
      </div>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20 animate-fade-in">
      <div className="bg-[#FEF0EC] border border-[#E85D3A]/20 rounded-xl px-6 py-4 max-w-md">
        <div className="text-sm text-[#E85D3A] font-medium mb-1">Ошибка</div>
        <div className="text-sm text-[#6B6B6B]">{message}</div>
      </div>
    </div>
  );
}
