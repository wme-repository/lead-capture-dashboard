import { FlaskConical } from "lucide-react";

export default function AbTestsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">A/B Tests</h1>
        <p className="mt-1 text-xs text-gray-500">Comparação de variações de formulário e criativo.</p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-600">
          <FlaskConical size={24} />
        </div>
        <p className="text-sm font-medium text-gray-700">Em breve</p>
        <p className="max-w-sm text-xs text-gray-400">
          Esta seção vai comparar conversão e qualidade de leads entre variações (ex.: formulário A
          vs. B). Ainda não há um experimento configurado — o &quot;Score A/B&quot; do dashboard se
          refere à classificação A/B/C/D do lead, não a um teste A/B.
        </p>
      </div>
    </div>
  );
}
