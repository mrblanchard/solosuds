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
}

export default function CKEditorWrapper({ onChange }: Props) {
  const ready = useRef(false);

  return (
    <CKEditor
      editor={ClassicEditor}
      config={{
        licenseKey: "GPL",
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
        placeholder: "Compose your email…",
      }}
      onReady={() => { ready.current = true; }}
      onChange={(_event, editor) => {
        if (ready.current) onChange(editor.getData());
      }}
    />
  );
}
