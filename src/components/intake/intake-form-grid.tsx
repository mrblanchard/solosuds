"use client";

import { useState, useCallback, useId } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SavedToast from "@/components/ui/saved-toast";
import { formatDate } from "@/lib/utils";
import DuplicateFormButton from "@/components/intake/duplicate-form-button";
import DeleteFormButton from "@/components/intake/delete-form-button";

interface IntakeFormItem {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { submissions: number };
}

interface Props {
  forms: IntakeFormItem[];
}

function SortableCard({
  form,
  onDuplicated,
}: {
  form: IntakeFormItem;
  onDuplicated: (newForm: IntakeFormItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: form.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : "auto",
      }}
      className={`flex flex-col rounded-xl border bg-white p-5 transition-shadow ${
        isDragging
          ? "border-indigo-300 shadow-lg ring-2 ring-indigo-200"
          : "border-gray-200 hover:border-indigo-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing touch-none select-none"
            aria-label="Drag to reorder"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{form.title}</h3>
            {form.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{form.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={form.isActive ? "success" : "secondary"}>
            {form.isActive ? "Active" : "Inactive"}
          </Badge>
          <DeleteFormButton formId={form.id} formTitle={form.title} />
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-400">
        {form._count.submissions} submission{form._count.submissions !== 1 ? "s" : ""} ·
        Created {formatDate(form.createdAt)}
      </div>
      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-gray-100">
        <Link href={`/dashboard/intake/${form.id}`}>
          <Button size="sm" variant="outline">Edit</Button>
        </Link>
        <Link href={`/dashboard/intake/${form.id}/submissions`}>
          <Button size="sm" variant="ghost">Submissions</Button>
        </Link>
        <div className="ml-auto">
          <DuplicateFormButton formId={form.id} onDuplicated={onDuplicated} />
        </div>
      </div>
    </div>
  );
}

export default function IntakeFormGrid({ forms: initialForms }: Props) {
  const [forms, setForms] = useState(initialForms);
  const [saveCount, setSaveCount] = useState(0);
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const persistOrder = useCallback(async (ordered: IntakeFormItem[]) => {
    await fetch("/api/intake-forms/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((f) => f.id) }),
    });
    setSaveCount((c) => c + 1);
  }, []);

  function handleDuplicated(newForm: IntakeFormItem) {
    setForms((prev) => [...prev, newForm]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setForms((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      persistOrder(next);
      return next;
    });
  }

  return (
    <>
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToWindowEdges]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={forms.map((f) => f.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {forms.map((form) => (
            <SortableCard key={form.id} form={form} onDuplicated={handleDuplicated} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
    <SavedToast show={saveCount > 0} key={saveCount} message="Order saved" />
    </>
  );
}
