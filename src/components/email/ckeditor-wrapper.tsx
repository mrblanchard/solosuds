"use client";

import { useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  Alignment,
  Link,
  List,
  Indent,
  IndentBlock,
  BlockQuote,
  Table,
  TableToolbar,
  MediaEmbed,
  Undo,
  Paragraph,
  Font,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

interface Props {
  onChange: (html: string) => void;
  /**
   * Content to seed the editor with when it first mounts. CKEditor 5's React
   * binding is uncontrolled after creation (it does not re-sync a `value`
   * prop on every keystroke), so this is only read once at initialization,
   * not kept in sync on later renders. To force a reset to new content,
   * remount the component with a different `key`.
   */
  initialData?: string;
  placeholder?: string;
}

export default function CKEditorWrapper({ onChange, initialData, placeholder }: Props) {
  const ready = useRef(false);

  return (
    <CKEditor
      editor={ClassicEditor}
      config={{
        licenseKey: "GPL",
        initialData: initialData ?? "",
        plugins: [
          Essentials, Bold, Italic, Underline, Strikethrough,
          Heading, Alignment, Link, List, Indent, IndentBlock,
          BlockQuote, Table, TableToolbar, MediaEmbed, Undo,
          Paragraph, Font,
        ],
        toolbar: [
          "undo", "redo", "|",
          "heading", "|",
          "bold", "italic", "underline", "strikethrough", "|",
          "alignment", "|",
          "bulletedList", "numberedList", "outdent", "indent", "|",
          "link", "blockQuote", "insertTable", "|",
          "fontSize", "fontColor",
        ],
        table: {
          contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
        },
        placeholder: placeholder ?? "Compose your email…",
      }}
      onReady={() => { ready.current = true; }}
      onChange={(_event, editor) => {
        if (ready.current) onChange(editor.getData());
      }}
    />
  );
}
