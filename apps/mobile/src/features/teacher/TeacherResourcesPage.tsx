import { useEffect, useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { GeneratedActionIcon } from "@/components/common/GeneratedActionIcon";
import { PageContainer } from "@/components/layout/PageContainer";
import { ResourceCard } from "@/components/cards/ResourceCard";
import { EmptyState } from "@/components/common/EmptyState";
import { listPublishedResources, publishTeacherResource } from "@/services/resourceService";
import { DOCUMENT_TYPES } from "@/constants/demoData";
import type { ClassInfo, ResourceItem, SubjectOption } from "@/types/school";
import { getSchoolSubjects, getTeacherClasses } from "@/services/mainDataService";

export function TeacherResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classId, setClassId] = useState("");
  const [subject, setSubject] = useState("");
  const [docType, setDocType] = useState<ResourceItem["type"]>("cours");
  const [file, setFile] = useState<File | null>(null);
  const [visibleToParents, setVisibleToParents] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { Promise.all([listPublishedResources(), getTeacherClasses(), getSchoolSubjects()]).then(([nextResources, nextClasses, nextSubjects]) => { setResources(nextResources); setClasses(nextClasses); setSubjects(nextSubjects); setClassId(nextClasses[0]?.id ?? ""); setSubject(nextSubjects[0]?.id ?? ""); }); }, []);

  async function handlePublish() {
    if (!file || !title || !classId || !subject) return;
    setLoading(true);
    setStatus("");
    const result = await publishTeacherResource({
      classId,
      subjectId: subject,
      title,
      description,
      type: docType,
      file,
      visibleToParents,
    });
    setStatus(result.message);
    if (result.success) {
      setShowForm(false);
      setTitle("");
      setDescription("");
      setFile(null);
      listPublishedResources().then(setResources);
    }
    setLoading(false);
  }

  return (
    <PageContainer>
      <AppHeader
        title="Ressources"
        subtitle="Documents partagés"
        action={
          <button type="button" onClick={() => setShowForm(!showForm)} className="tap rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white">
            <GeneratedActionIcon name="upload" className="mr-1 inline h-8 w-8" /> Publier
          </button>
        }
      />

      {showForm ? (
        <div className="card mb-5 space-y-4 p-5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" />
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm">
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm">
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={docType} onChange={(e) => setDocType(e.target.value as ResourceItem["type"])} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm">
            {DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <label className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <span>Visible également par les parents</span>
            <input type="checkbox" checked={visibleToParents} onChange={(e) => setVisibleToParents(e.target.checked)} className="h-5 w-5 accent-primary" />
          </label>
          <button type="button" onClick={handlePublish} disabled={loading || !file || !title || !classId || !subject} className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-2 text-sm font-semibold text-white disabled:opacity-50">
            <GeneratedActionIcon name="upload" className="h-8 w-8" />{loading ? "Publication..." : "Publier le document"}
          </button>
          {status ? <p className="text-center text-sm text-gray-600">{status}</p> : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {resources.length ? resources.map((r) => <ResourceCard key={r.id} resource={r} />) : (
          <EmptyState title="Aucune ressource" description="Les ressources publiées apparaîtront ici." />
        )}
      </div>
    </PageContainer>
  );
}
