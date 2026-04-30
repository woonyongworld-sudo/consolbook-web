import {
  FILE_TYPES,
  FILE_TYPE_LABELS,
  type FileTypeKey,
  type UploadedFile,
} from "@/modules/types";

export function FilesPanel({
  files,
  onChangeType,
  onRemove,
}: {
  files: UploadedFile[];
  onChangeType: (id: string, type: FileTypeKey) => void;
  onRemove: (id: string) => void;
}) {
  if (files.length === 0) return null;
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
        업로드된 파일 ({files.length})
      </div>
      <ul className="divide-y divide-slate-100">
        {files.map((f) => (
          <li
            key={f.id}
            className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
          >
            <span className="font-mono text-xs text-slate-500">
              {f.rows.length}행
            </span>
            <span className="font-medium text-slate-900">{f.name}</span>
            <select
              value={f.type}
              onChange={(e) =>
                onChangeType(f.id, e.target.value as FileTypeKey)
              }
              className="ml-auto rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              {FILE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t} · {FILE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <button
              onClick={() => onRemove(f.id)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="제거"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
