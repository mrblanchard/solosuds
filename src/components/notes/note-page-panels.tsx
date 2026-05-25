"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import SoapNoteEditor from "@/components/notes/soap-note-editor";
import ClientReminderPanel from "@/components/notes/client-reminder-panel";

interface NotePagePanelsProps {
  note: {
    id: string;
    clientId: string;
    clientName: string;
    clientEmail: string | null;
    sessionDate: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    sessionNotes: string;
    noteFormat: string;
    diagnosisCodes: string;
    procedureCodes: string;
    status: string;
  };
  upcomingAppointments: Array<{
    id: string;
    startTime: string;
    endTime: string;
    serviceName: string | null;
    reminderSentAt: string | null;
  }>;
}

const STORAGE_KEY = "note-panel-order";

export default function NotePagePanels({ note, upcomingAppointments }: NotePagePanelsProps) {
  // Default: reminders on top (true = reminders first)
  const [remindersFirst, setRemindersFirst] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setRemindersFirst(stored === "true");
  }, []);

  function toggleOrder() {
    const next = !remindersFirst;
    setRemindersFirst(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  const reminderPanel = (
    <ClientReminderPanel
      clientId={note.clientId}
      clientName={note.clientName}
      clientEmail={note.clientEmail}
      sessionDate={note.sessionDate}
      upcomingAppointments={upcomingAppointments}
    />
  );

  const editorPanel = (
    <SoapNoteEditor
      noteId={note.id}
      clientName={note.clientName}
      initialData={{
        subjective: note.subjective,
        objective: note.objective,
        assessment: note.assessment,
        plan: note.plan,
        sessionNotes: note.sessionNotes,
        noteFormat: note.noteFormat,
        diagnosisCodes: note.diagnosisCodes,
        procedureCodes: note.procedureCodes,
        status: note.status,
      }}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={toggleOrder} className="text-gray-400 hover:text-gray-600">
          <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
          {remindersFirst ? "Move reminders below notes" : "Move reminders above notes"}
        </Button>
      </div>
      {remindersFirst ? (
        <>
          {reminderPanel}
          {editorPanel}
        </>
      ) : (
        <>
          {editorPanel}
          {reminderPanel}
        </>
      )}
    </div>
  );
}
