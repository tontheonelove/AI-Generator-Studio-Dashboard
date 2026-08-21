export function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-4 text-slate-400">
      <div className="text-6xl">🚧</div>
      <h2 className="text-2xl font-semibold text-white">{name}</h2>
      <p className="text-sm">หน้านี้กำลังอยู่ระหว่างการย้ายจากระบบเดิม</p>
    </div>
  );
}